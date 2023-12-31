// import axios from 'axios'
import express from "express";
import cors from "cors";
// import axios from 'axios';
import NodeMailer from "nodemailer";
import dotenv from "dotenv";
import stripeRoutes from "./routes/stripeRoutes.js";
import { createClient } from "@supabase/supabase-js";
import bodyParser from "body-parser";
import {
  addtargetings,
  generateRandomPassword,
  uploadImageFromURL,
} from "./helper.js";

dotenv.config({ path: ".env" });
const PORT = process.env.PORT || 8000;
const app = express();
// app.use(express.urlencoded())
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseKeyA = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKeyA);
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

const transporter = NodeMailer.createTransport({
  host: process.env.SMPT_HOST,
  port: process.env.SMPT_PORT,
  debug: true,
  auth: {
    user: process.env.SMPT_LOGIN,
    pass: process.env.SMPT_KEY,
  },
});

const send_email = (to, subject, content) => {
  transporter.sendMail(
    {
      from: "SproutySocial Support support@sproutysocial.com",
      to,
      subject,
      html: content,
      sender: { name: "SproutySocial", email: "support@sproutysocial.com" },
    },
    (error, info) => {
      if (error) {
        console.log(error);
        return { success: false, message: error };
      } else {
        console.log("email sent to: " + info.accepted[0]);
        return { success: true, message: info.response };
      }
    }
  );
};

app.post("/api/addTargetings", async (req, res) => {
  try {
    const { account: mainAccountUsername, accounts: accsWithTable } = req.body;
    
    // Iterate through each element of accsWithTable array
    const parsedAccounts = accsWithTable.map((accountString) => {
      try {
        // Replace single quotes with double quotes and parse into an object
        return JSON.parse(accountString.replace(/'/g, '"'));
      } catch (error) {
        console.error("Error parsing account string:", error);
        return null; // or handle the error as needed
      }
    });

    if (!mainAccountUsername) {
      console.log("mainAccountUsername not found!");
      return res.status(500).send({ message: `mainAccountUsername not found!` });
    }

    const { data: mainAccUser, error: getMainAccUserError } = await supabase
      .from("users")
      .select()
      .eq("username", mainAccountUsername).single();

    if (getMainAccUserError) {
      console.log('getMainAccUserError: account not found in database!', getMainAccUserError);
      return res
        .status(500)
        .send({ message: `account not found in database!` });
    }
    
    console.log('addtargetings start');

    await supabase.from('targeting').delete().eq('user_id', mainAccUser?.user_id)
    await supabase.from('whitelist').delete().eq('user_id', mainAccUser?.user_id)

    for (const index in parsedAccounts) {
      if (Object.hasOwnProperty.call(parsedAccounts, index)) {
        const accWithTable = parsedAccounts[index];
        await addtargetings(accWithTable, mainAccUser);
      }
    }
    console.log('addtargetings end');

    res
      .status(200)
      .send({ message: `successfully added ${mainAccountUsername}` });
  } catch (error) {
    console.log("error addTargetings");
    console.log(error);
  }
});

app.post("/api/create_user_profile", async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(500).send({ message: `username not found!` });
  }
  console.log(`creating profile for ${username}`);
  // if user does not exist:
  // auth user
  const email = `${username}@gmail.com`;
  const password = generateRandomPassword(6);

  const {
    data: { user: authUser },
    error: SignupError,
  } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  // Create in backend

  if (!SignupError && authUser) {
    console.log(`created authUserData for ${authUser.email}`);
    // upload profile picture
    let profile_pic_url = "";
    try {
      const uploadImageFromURLRes = await uploadImageFromURL(username);

      if (uploadImageFromURLRes?.status === "success") {
        profile_pic_url = uploadImageFromURLRes?.data ?? "";
      }

      profile_pic_url
        ? console.log(` profile picture for ${username} has been uploaded`)
        : console.log(` profile picture for ${username} was not uploaded`);
    } catch (error) {
      console.error("failed to upload profile picture: ", error);
    }
    // todo: create user profile
    const defaultData = {
      start_time: new Date(),
      is_verified: true,
      biography: "",
      status: "active",
      userMode: "auto",
      messageSender:
        '{"sms":false,"code":"","admin":"","method":"","approve":false}',
      first_account: true,
    };

    const { error } = await supabase.from("users").upsert({
      ...defaultData,
      username,
      full_name: username,
      profile_pic_url,
      user_id: authUser.id,
      email: authUser.email,
      password,
    });
    if (!error) {
      console.log(`user profile createed successfully for ${username}`);
      return res.send({ message: "success" }).status(200);
    } else {
      error && console.error(`error creating profile for: ${username}`);
      error && console.error(error);
      return res.status(500).send({ message: `failed: ${error}` });
    }
  } else {
    console.log(
      `failed to create authUserData for ${username}: ${SignupError}`
    );
    SignupError && console.error(SignupError);
    return res.status(500).send({ message: `failed: ${SignupError}` });
  }
  // return res.send({ message: 'success' }).status(200);
});

app.post("/api/auth_user", async (req, res) => {
  const { email, password } = req.body;
  console.log("{ email, password }");
  console.log({ email, password });
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  error && console.log("error creating auth_user: ", error);
  return res.send({ data: user, error });
});

app.post("/api/send_email", async (req, res) => {
  send_email(req.body.email, req.body.subject, req.body.htmlContent);
  res.send({ success: true, message: "Email sent successfully" });
});

app.use("/api/stripe", stripeRoutes);

app.get("/", (req, res) => res.send("Hello World!"));

// app.listen(8000, () => console.log('Example app listening on port 8000!'))
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
