import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

// this is just a method to generate the tokens just to make our life easier
const generateAccessAndRefreshToken = async(userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()


        user.refreshToken= refreshToken
        await user.save({validateBeforeSave : false})
        //validateBeforeSave is used because we try to save the user and moongose hit and want password also which will cause a error so just to escape this as we what we are doing we make validation false

        return{accessToken,refreshToken}
    } catch (error) {
        throw new ApiError(500,"Something went wrong while genrating refresh and access token")
    }
}

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
    console.log("email:",req.body);
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

    const existedUser = await User.findOne({
        $or : [{username},{email}]
    })
    if(existedUser){
        throw new ApiError(409,"User with this email and username already exist")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

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

const loginUser = asyncHandler(async(req,res)=>{
    /*
    1. Extract data from req.body
    2. check whether you want username or email for login
    3. find the user
    4. check the password
    5. generate access token and refresh token
    6. send cookies
    */
   const {email,username,password} = req.body()

   if(!username || !email){
    throw new ApiError(400,"username or email are required")
   }

   const user = await User.findOne({
    $or : [{username},{email}]
   })

   if(!user){
    throw new ApiError(404,"User Not Found")
   }

   const isPasswordValid = await user.isPasswordCorrect(password)

   if(!isPasswordValid){
    throw new ApiError(401,"Invalid User Credentials")
   }

   const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id)
   const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

   //cookies

   const options = {
    httpOnly : true,
    secure : true
   }

   return res
   .status(200)
   .cookie("accessToken",accessToken,options)
   .cookie("refreshToken",refreshToken,options)
   .json(
    new ApiResponse(
        200,
        //we are send this tokens if user want to access it Caution:Its not a good practice
        {
            user:loggedInUser,accessToken,refreshToken
        },
        "User Logged In Successfully"
    )
   )
})

const logoutUser = asyncHandler(async(req,res)=>{
    /*
    1. remove cookie
    2. remove token
    */
   await User.findByIdAndUpdate(
    req.user._id,
    {
        $set:{
            refreshToken: undefined
        }
    },
    {
        new : true
    }
)
const options = {
    httpOnly : true,
    secure : true
   }
   return res
   .status(200)
   .clearCookie("accessToken",options)
   .clearCookie("refreshToken",options)
   .json(
    new ApiResponse(
        200,{},"User Logged Out"
    )
   )

})

export {registerUser
    ,loginUser
    ,logoutUser
}


