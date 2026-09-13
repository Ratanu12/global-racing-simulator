require("dotenv").config();
const express=require("express"), path=require("path"), crypto=require("crypto");
const Razorpay=require("razorpay");
const app=express(); app.use(express.json()); app.use(express.static(path.join(__dirname,"public")));

let razorpay=null;
if(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET){
  razorpay=new Razorpay({key_id:process.env.RAZORPAY_KEY_ID,key_secret:process.env.RAZORPAY_KEY_SECRET});
}
const PRICE=5999900;

app.post("/api/create-order",async(req,res)=>{
 try{
  const {name,phone,email,pin,city,state,address}=req.body||{};
  if(!name||!phone||!email||!pin||!city||!state||!address) return res.status(400).json({error:"Please fill all delivery details."});
  const orderId="WEB-"+Date.now();
  if(!razorpay) return res.json({demo:true,orderId});
  const order=await razorpay.orders.create({amount:PRICE,currency:"INR",receipt:orderId,payment_capture:1,
    notes:{name,phone,email,pin,city,state,address}});
  res.json({key:process.env.RAZORPAY_KEY_ID,orderId:order.id,amount:order.amount,currency:order.currency});
 }catch(e){res.status(500).json({error:"Could not create payment order."});}
});

app.post("/api/verify-payment",(req,res)=>{
 try{
  const {razorpay_order_id,razorpay_payment_id,razorpay_signature,customer}=req.body;
  if(!razorpay_order_id||!razorpay_payment_id||!razorpay_signature) return res.status(400).json({error:"Missing payment data."});
  const expected=crypto.createHmac("sha256",process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id+"|"+razorpay_payment_id).digest("hex");
  if(expected!==razorpay_signature) return res.status(400).json({error:"Payment verification failed."});
  const orderId="ORD-"+Date.now();
  console.log("PAID ORDER",orderId,{customer,razorpay_order_id,razorpay_payment_id});
  res.json({success:true,orderId});
 }catch(e){res.status(500).json({error:"Verification error."});}
});
app.listen(process.env.PORT||3000,()=>console.log("RacingRig running on http://localhost:"+(process.env.PORT||3000)));