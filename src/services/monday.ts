import prisma from "loaders/prisma";
import mondaySdk from "monday-sdk-js";

interface MondayData {
    data: {
      [key: string]: any;
    };
    account_id?: number;
  }
  
const monday = mondaySdk();
monday.setApiVersion("2023-10");

const SCOPES = "me:read updates:read webhooks:write"

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
        
        monday.setToken(receivedData.access_token)
        const options = {token:receivedData.access_token}
        const mondayData:MondayData = await monday.api(query)
        const data = mondayData.data.me;

        let user = await prisma.user.findUnique({
            where: {
                email: data.email,
            },
        });


        if(!user){
            user = await prisma.user.create({
            data: {
            email: data.email,
            name: data.name,
            mondayAuthCredentials: {
                create: {
                mondayId:data.id,
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

            if (!mondayAuthCredentials) {
                user = await prisma.user.update({
                where: {
                    id: user.id,
                },
                data: {
                    name: data.name,
                    mondayAuthCredentials: {
                    create: {
                        mondayId:data.id,
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
                            mondayId:data.id,
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
    const existingComment:any = await prisma.comment.findFirst({
      where: {
        platform,
        platformId: comment.id,
      },
    });

    console.log("comment:", comment)
    const isAuthorAUser = comment?.creator?.id == user.mondayId
    ? await prisma.user.findFirst({ where: { id: user.userId } })
    : null;
  
  
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
            author: isAuthorAUser
            ? {
                create: {
                  user: {
                    connect: { id: isAuthorAUser.id },
                  },
                },
              }
            : {
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
          platform,
          platformId: comment.id,
          content: comment.body,
          createdAt: comment.created_at,
          updatedAt: comment.updated_at,
          author: isAuthorAUser
          ? {
              create: {
                user: {
                  connect: { id: isAuthorAUser.id },
                },
              },
            }
          : {
              create: {
                platformName: comment?.creator?.name,
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

        let comments:any = await monday.api(query)
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
  