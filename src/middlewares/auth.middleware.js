import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js"

export const verifyJWT = asyncHandler(async(req,_,next)=>{
   try {
     // req has access to cookies because of cookie-parser
     // now we are doing optional chaining here to get the token and header also if in any case request is coming from mobile
     const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
 
     if(!token){
         throw new ApiError(401,"UnAuthorized Request")
     }
     console.log("Extracted Token:", token, typeof token);
 
     const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
 
     const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
     if(!user){
         throw new ApiError(401,"Invalid access Token")
     }
 
     req.user = user;
     next();
 
   } catch (error) {
    throw new ApiError(401,error?.message||"Invalid Access Token")
   }

})

