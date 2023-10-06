import express from "express";
import { GoogleService } from "services";
import {MondayService} from "services"

const app = express();
const port = 8080;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get('/google/auth', (req, res) => {
  res.send(GoogleService.getAccessTokenUrl());
});

app.get('/google/callback', async (req, res) => {
  const code = req.query.code;
  await GoogleService.authorize(code as string);
})

app.get('/monday/auth', (req,res)=>{
  res.redirect(MondayService.getAccessTokenUrl());
})


app.get('/monday/callback', async (req, res) => {
  res.send("Welcome Back!");
  const code = req.query.code;
  await MondayService.authorize(code as string);
})

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
