
import express from 'express';
import cors from 'cors'
// import axios from 'axios';
import NodeMailer from 'nodemailer'
import dotenv from 'dotenv';
import stripeRoutes from './routes/stripeRoutes.js';

dotenv.config({ path: '.env' });
const PORT = process.env.PORT || 8000
const app = express()
app.use(express.urlencoded())
app.use(cors())

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


app.post('/api/send_email', async (req, res) => {
  send_email(req.body.email, req.body.subject, req.body.htmlContent)
  res.send({ success: true, message: 'Email sent successfully' })
})

app.use('/api/stripe', stripeRoutes);

app.get('/', (req, res) => res.send('Hello World!'))

// app.listen(8000, () => console.log('Example app listening on port 8000!'))
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
