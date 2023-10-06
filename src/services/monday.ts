import { google, drive_v3 } from "googleapis";

import prisma from "loaders/prisma";
import { User, File } from "@prisma/client";


const SCOPES = "me:read updates:read webhooks:write"

const oAuthClient = () => {
  return new google.auth.OAuth2({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
    forceRefreshOnFailure: true,
  });
};

export const oAuthClientWithCredentials = (credentials: {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiryDate: number;
}) => {
  const oAuth2Client = oAuthClient();
  oAuth2Client.setCredentials(credentials);
  return oAuth2Client;
};

export const getAccessTokenUrl = () => {
  const authUrl = `https://auth.monday.com/oauth2/authorize?client_id=${process.env.MONDAY_CLIENT_ID}?redirect_uri=${process.env.MONDAY_REDIRECT_URI}?scope=${SCOPES}`;
  return authUrl;
};

export const authorize = (code: string) => {
  return new Promise( async (resolve, reject) => {
    const url = `https://auth.monday.com/oauth2/token`; 

    const accessRequestBody = new URLSearchParams();
    accessRequestBody.append('client_id', process.env.MONDAY_CLIENT_ID);
    accessRequestBody.append('client_secret', process.env.MONDAY_CLIENT_SECRET);
    accessRequestBody.append('redirect_uri', process.env.MONDAY_REDIRECT_URI)
    accessRequestBody.append('code', code);

    const accessRequestOptions = {
        method: 'POST',
        headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: accessRequestBody.toString(),
    };



    try{
        const response = await fetch(url, accessRequestOptions);
        const receivedData = await response.json();

        if (!response.ok) {
            console.error('Failed with status:', response.status);
            return;
        }
    
        if (!receivedData.access_token) {
            console.error('Access token missing:', receivedData);
            return;
        }

        let query = "query { me {  name id email}}";
        
        
        const responseForData = await fetch ("https://api.monday.com/v2", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization' : `${receivedData.access_token}`,
            'API-Version' : '2023-04'
            },
        body: JSON.stringify({
         query
        })
        });
        let data = await responseForData.json();
        data = data.data.me;

        let user = await prisma.user.findUnique({
            where: {
                email: data.email,
            },
        });
       
        // Would you want access token to be hashed before being stored in db?

        if(!user){
            user = await prisma.user.create({
            data: {
            email: data.email,
            name: data.name,
            mondayAuthCredentials: {
                create: {
                accessToken: receivedData.access_token,
                scope: receivedData.scope,
                tokenType: receivedData.token_type,
                },
            },
            },
        });
        console.log('User & Monday created:', user);
        }else{
            const mondayAuthCredentials = await prisma.mondayAuthCredentials.findUnique({
                where: {
                userId: user.id,
                },
            });
            // Would this be needed? Since the token cant expire.
            if (!mondayAuthCredentials) {
                user = await prisma.user.update({
                where: {
                    id: user.id,
                },
                data: {
                    name: data.name,
                    mondayAuthCredentials: {
                    create: {
                        accessToken: receivedData.access_token,
                        scope: receivedData.scope,
                        tokenType: receivedData.token_type,
                    },
                    },
                },
                });
                console.log('Monday Created:', user);
            }else{
                user = await prisma.user.update({
                    where: {
                        id: user.id,
                    },
                    data: {
                        name: data.name,
                        mondayAuthCredentials: {
                        update: {
                            accessToken: receivedData.access_token,
                            scope: receivedData.scope,
                            tokenType: receivedData.token_type,
                        },
                        },
                    },
                    });
                console.log('Monday updated:', user);
            }
            
        }
        getComments(user.email)
        return resolve(user);
    }catch(e){
        console.error('Error during OAuth2 token retrieval:', e);
    }
  });
};


  const commentCreateUpdate = async (
    comment: any,
    user,
    platform
  ) => {

    try{

// Not really sure what platform name and some other stuff arre intended for, wasnt sure if I was supposed to change the db to make them optional but kinda just filled in with buffer info

    const existingComment:any = await prisma.comment.findFirst({
      where: {
        platform,
        platformId: comment.id,
      },
    });
  
    console.log(existingComment)

    // const isAuthorAUser = comment?.creator.name
    //   ? await prisma.user.findFirst({ where: { name: user.name } })
    //   : null;
  
    if (existingComment) {
      if (
        existingComment.body == comment.body 
      ) {
        const newComment = await prisma.comment.update({
          where: {
            id: existingComment.id,
          },
          data: {
            content: comment.body,
            createdAt: comment.created_at,
            updatedAt: comment.updated_at,
            platform,
            author:
            //  isAuthorAUser
            //   ? {
            //       create: {
            //         user: {
            //           connect: { id: isAuthorAUser.id },
            //         },
            //       },
            //     }
            //   : 
              {
                  create: {
                    platformName: comment?.creator?.name,
                  },
                },
          },
        });
        console.log("Updated a comment in db:", newComment)
      }
    } else {
      if (!comment.creator.name) {
        return null;
      }

      const newComment = await prisma.comment.create({
        data: {
        // file: {
        //     connect: {
        //         id: comment.creator.id,
        //     },
        // },
          platform,
          platformId: comment.id,
          content: comment.body,
          createdAt: comment.created_at,
          updatedAt: comment.updated_at,
          author: 
        //   isAuthorAUser
            // ? {
            //     create: {
            //       user: {
            //         connect: { id: isAuthorAUser.id },
            //       },
            //     },
            //   }
            // : 
            {
                create: {
                  platformName: comment.creator.name,
                },
              },
        },
      });
      console.log("Created new comment in db:", newComment)
    }

    }
    catch(e){
        console.error('Error during comments updates:', e);
    }
  };
  
  export const getComments = async (
    email:string
  ): Promise<void> => {

    // Gives the users own comments too, not sure if this is wanted, can probably filter them out.
    try{

        const user = await prisma.user.findUnique({
            where: {
                email
            },
        });
    
        const mondayAuthCredentials = await prisma.mondayAuthCredentials.findUnique({
            where: {
              userId: user.id,
            },
          });
    

        // Can add a limit on how many to return -> e.g. updates (limit:100)
        // body is how the comment was formatted with html
        let query = "query {updates { id body text_body updated_at created_at assets{url} creator{name id} replies{body text_body updated_at created_at creator {name} }  }}";

        const response = await fetch ("https://api.monday.com/v2", {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        'Authorization' : `${mondayAuthCredentials.accessToken}`
        },
        body: JSON.stringify({
            query 
        })
        })
        
        let comments = await response.json()
        comments = comments.data.updates;

        for (const comment of comments) {
            const replies = comment.replies;
            await commentCreateUpdate(comment, user, "Monday");
            if (replies) {
                replies.map(async (reply)=>{
                    await commentCreateUpdate(reply, user, "Monday");
                })
                
              }
          }

    }catch(e){
        console.error('Error during comments retrieval:', e);
    }

  


  };
  