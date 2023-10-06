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

export const authorize = (code: string, state = undefined) => {
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
    }catch(e){
        console.error('Error during OAuth2 token retrieval:', e);
    }
  });
};
