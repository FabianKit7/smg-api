import express from 'express';
import dotenv from 'dotenv';
import Stripe from 'stripe'

dotenv.config({ path: '.env' });
const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post('/', async (req, res) => {
    return res.json({});
});

router.post('/create_subscription', async (req, res) => {
    try {
        const { name, email, paymentMethod, price } = req.body;
        // console.log({ name, email, paymentMethod, price });
        const customer = await stripe.customers.create({
            name, email,
            payment_method: paymentMethod,
            invoice_settings: { default_payment_method: paymentMethod }
        })

        // const product = await stripe.products.create({
        //     name: "Monthly Subscription",
        // })

        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [
                // {
                //     price_data: {
                //         currency: "USD",
                //         product: product.id,
                //         unit_amount: "40000",
                //         recurring: {
                //             interval: "month"
                //         }
                //     }
                // }
                {
                    price
                }
            ],
            payment_settings: {
                payment_method_types: ['card'],
                save_default_payment_method: "on_subscription"
            },
            expand: ['latest_invoice.payment_intent']
        })

        return res.status(200).json({
            message: `Subscription successful!`,
            customer,
            subscription,
            clientSecret: subscription.latest_invoice.payment_intent.client_secret
        });
    } catch (error) {
        // console.error(error);
        return res.status(500).json({ message: `Internal server error: ${error}` });
    }
});

router.post('/retrieve_customer', async (req, res) => {
    const { customer_id } = req.body;
    const customer = await stripe.customers.retrieve(
        customer_id
    ).catch(err => err);
    return res.json(customer);
});

router.post('/list_payment_methods', async (req, res) => {
    const { customer_id } = req.body;
    const paymentMethods = await stripe.customers.listPaymentMethods(
        customer_id,
        { type: 'card' }
    ).catch(err => err);
    return res.json(paymentMethods);
});

router.post('/attach_payment_method_to_customer', async (req, res) => {
    const { customer_id, pm_id } = req.body;
    const paymentMethod = await stripe.paymentMethods.attach(
        pm_id,
        { customer: customer_id }
    ).catch(err => err);
    return res.json(paymentMethod);
});

export default router