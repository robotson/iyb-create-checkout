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
        // also collect shipping data:
        const shipping_data = [];

        for(let item of cart){
          const priceList = await stripe.prices.list({product: item.id, active:true, limit:1})
          const price = priceList.data[0];
          line_items.push({price: price.id, quantity: item.quantity})
          shipping_data.push({
            price: price.id,
            quantity: item.quantity,
            us_days_max: price.metadata.us_days_max,
            us_days_min: price.metadata.us_days_min,
            us_ship_additional: price.metadata.us_ship_additional,
            us_ship_rate: price.metadata.us_ship_rate,
          })
        }
        //console.log(line_items);

        // create shipping options payload:
        const shipping_options = getShippingOptions(shipping_data);

        const session = await stripe.checkout.sessions.create({
          line_items: line_items,
          mode: 'payment',
          success_url: `${env.STRIPE_CALLBACK_DOMAIN}/success.html`,
          cancel_url: `${env.STRIPE_CALLBACK_DOMAIN}/cancel.html`,
          shipping_options: shipping_options,
          shipping_address_collection: {allowed_countries: ['US']},
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
  
function getShippingOptions(shipping_data){

  let total_amount = 0;
  let min = Number.MAX_VALUE;
  let max = Number.MIN_VALUE;

  for(const item of shipping_data){
    if(item.quantity > 1){
      total_amount += item.us_ship_additional * (item.quantity-1);
    }
    total_amount += (item.us_ship_rate)
    if(item.us_days_min < min){
      min = item.us_days_min;
    }
    if(item.us_days_max > max){
      max = item.us_days_max;
    }
  }

  const payload = {
    type: 'fixed_amount',
    fixed_amount: {amount: total_amount, currency: 'usd'},
    display_name: 'Standard Ground Shipping',
    delivery_estimate: {
      minimum: {unit: 'business_day', value: min},
      maximum: {unit: 'business_day', value: max},
    },
  }

  return [{shipping_rate_data: payload}]
}


export default {
  fetch: handleRequest
}

