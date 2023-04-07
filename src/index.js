const Stripe = require('stripe');

async function handleRequest(request, env) {
    const stripe = Stripe(env.STRIPE_SECRET_KEY);
    const { headers } = request
    const contentType = headers.get('content-type') || '';

    if (request.method === 'POST' && contentType.includes('application/json')) {
      try {
        // Extract the POST data as a JSON object
        const { cart } = await request.json();
        
        const line_items = [];
        // get prices for each item and build line_items payload
        for(let item of cart){
          const priceList = await stripe.prices.list({product: item.id, active:true, limit:1})
          line_items.push({price: priceList.data[0].id, quantity: item.quantity})
        }
        //console.log(line_items);

        const session = await stripe.checkout.sessions.create({
          line_items: line_items,
          mode: 'payment',
          success_url: `${env.STRIPE_CALLBACK_DOMAIN}/success.html`,
          cancel_url: `${env.STRIPE_CALLBACK_DOMAIN}/cancel.html`,
        });

        const json = JSON.stringify({url: session.url});

      
        return new Response(json, {
          headers: {
            "content-type": "application/json;charset=UTF-8",
          },
        });

      } catch (err) {
        console.error('Error parsing webhook payload--', err)
      }
    } else {
      console.error('Invalid webhook request + wasn\'t a post + ratio + don\'t care--');
    }
  
    return new Response("it's not ya boi",{ status: 400 });
  };
  
export default {
  fetch: handleRequest
}