import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({
    origin : process.env.CORS_ORIGIN,
    credentials : true
}))

app.use(express.json({limit: "16kb"}))
// this urlencoded is used to encode the url because somewhere vansh kansal 
// can be like this vansh+kansal or vansh%20kansal
app.use(express.urlencoded({
    extended:true,
    limit : "16kb"
}))
//the static is used to store files on the server 
app.use(express.static("public"))

// this cookie-parser is used to server se user ke brower ke cookie access kr pau 
// aur jrurat h toh crud operation perform kr pau 
app.use(cookieParser()) 



// routes

import userRouter from "./routes/user.routes.js"


app.use("/api/v1/users",userRouter)


export {app}