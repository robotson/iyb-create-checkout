const Stripe = require('stripe');


async function handleRequest(request, env) {
    const stripe = Stripe(env.STRIPE_SECRET_KEY);

    return new Response("http my face");
}


export default {
  fetch: handleRequest
}