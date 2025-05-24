import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
const registerUser = asyncHandler(async(req,res)=>{
    /* 
    steps:
    1. get user detail from frontend
    2. validation - not empty
    3. check if user already exists
    4. check for images , check for avatar
    5. upload them to cloudinary,avatar is uploaded
    6. create user object - create entry in db
    7. remove password and refresh token from response
    8. check for the user creation
    9. return response
    */

    const {fullName,email,username,password} = req.body
    console.log("email:",email);

    // if(fullName === ""){
    //     throw new ApiError(400,"FullName is required")
    // }

    if(
        [fullName,email,username,password].some((field)=>
        field?.trim() === "")
    ){
        throw new ApiError(400,"All fields are required")
    }
    //TODO: ALSO CHECK FOR OTHER VALIDATION LIKE EMAIL ETC.

    const existedUser = User.findOne({
        $or : [{username},{email}]
    })
    if(existedUser){
        throw new ApiError(409,"User with this email and username already exist")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,"avatar file is required")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!avatar){
        throw new ApiError(400,"avatar file is required")
    }
    const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username : username.toLowerCase()
    })
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
    }
    return res.status(201).json(
        new ApiResponse(200,createdUser,"User created Successfully")
    )
})

export {registerUser}


