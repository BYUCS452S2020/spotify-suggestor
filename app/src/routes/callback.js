'use strict';
import db from '../persistence/index.js';
import fetch from 'node-fetch';

const callback_uri = encodeURIComponent(`${process.env.APPLICATION_URL}/callback`);
const clientIDSecret = Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString('base64');

export default async (req, res) => {
   if (req.query.error) {
      res.send(`Error: ${req.query.error}`);
      return;
   }
   const auth_code = req.query.code;
   const state = JSON.parse(req.query.state);
   const userID = state.userID;
   const inquirer = state.inquirer;

   const requestData = `grant_type=authorization_code&code=${auth_code}&redirect_uri=${callback_uri}`;
   const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      body: requestData,
      headers: {
         'Content-Type': 'application/x-www-form-urlencoded',
         'Authorization': `Basic ${clientIDSecret}`,
         'Accept': 'application/json',
         'Content-Length': requestData.length,
      }
   });
   const data = await response.json();
   const token = {
      accessToken: data.access_token,
      userID: userID,
      refreshToken: data.refresh_token,
      expirationUTC: new Date(Date.now() + (data.expires_in * 1000)).toUTCString(),
   };
   db.storeToken(token).catch((error) => {
      res.send('Error storing token: ' + error);
      return;
   });

   req.session.accessToken = token.accessToken;
   // res.redirect(`${process.env.APPLICATION_URL}/user/${userID}/refresh`);
   res.cookie('test', 'test cookie');
   res.cookie('access_token', 'Bearer ' + token.accessToken, {
      maxAge: 3600000,
      signed: true,
   });
   res.redirect(inquirer);
};
