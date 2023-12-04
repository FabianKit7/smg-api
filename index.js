
import express from 'express';
import cors from 'cors'
// import axios from 'axios';
import NodeMailer from 'nodemailer'
import dotenv from 'dotenv';
import stripeRoutes from './routes/stripeRoutes.js';
import { createClient } from '@supabase/supabase-js';
import bodyParser from 'body-parser';

dotenv.config({ path: '.env' });
const PORT = process.env.PORT || 8000
const app = express()
// app.use(express.urlencoded())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors())

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
    { from: "SproutySocial Support support@sproutysocial.com", to, subject, html: content, sender: { name: "SproutySocial", email: "support@sproutysocial.com" }, },
    (error, info) => {
      if (error) {
        console.log(error);
        return { success: false, message: error }
      } else {
        console.log("email sent to: " + info.accepted[0]);
        return { success: true, message: info.response }
      }
    }
  )
}

app.post('/api/auth_user', async (req, res) => {
  const { email, password } = req.body;
  console.log("{ email, password }");
  console.log({ email, password });
  const { data: { user }, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  error && console.log('error creating auth_user: ', error);
  return res.send({ data: user, error })
})

app.post('/api/send_email', async (req, res) => {
  send_email(req.body.email, req.body.subject, req.body.htmlContent)
  res.send({ success: true, message: 'Email sent successfully' })
})

app.use('/api/stripe', stripeRoutes);

app.get('/', (req, res) => res.send('Hello World!'))

// app.listen(8000, () => console.log('Example app listening on port 8000!'))
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
