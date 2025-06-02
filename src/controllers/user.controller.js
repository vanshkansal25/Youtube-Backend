import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

// this is just a method to generate the tokens just to make our life easier
const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
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
        avatar: {
            public_id: avatar.public_id,
            url: avatar.secure_url
        },
        coverImage: {
            public_id: coverImage?.public_id || "",
            url: coverImage?.secure_url || ""
        },
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

// const loginUser = asyncHandler(async(req,res)=>{
//     /*
//     1. Extract data from req.body
//     2. check whether you want username or email for login
//     3. find the user
//     4. check the password
//     5. generate access token and refresh token
//     6. send cookies
//     */
//    const {email,username,password} = req.body

//    if(!username && !email){
//     throw new ApiError(400,"username or email are required")
//    }
// //    if(!(username || email)){
// //     throw new ApiError(400,"username or email are required")
// //    }

//    const user = await User.findOne({
//     $or : [{username},{email}]
//    })

//    if(!user){
//     throw new ApiError(404,"User Not Found")
//    }

//    const isPasswordValid = await user.isPasswordCorrect(password)

//    if(!isPasswordValid){
//     throw new ApiError(401,"Invalid User Credentials")
//    }

//    const {accessToken,refreshToken} = await generateAccessAndRefereshTokens(user._id)
//    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

//    //cookies

//    const options = {
//     httpOnly : true,
//     secure : true
//    }

//    return res
//    .status(200)
//    .cookie("accessToken",accessToken,options)
//    .cookie("refreshToken",refreshToken,options)
//    .json(
//     new ApiResponse(
//         200,
//         //we are send this tokens if user want to access it Caution:Its not a good practice
//         {
//             user:loggedInUser,accessToken,refreshToken
//         },
//         "User Logged In Successfully"
//     )
//    )
// })
const loginUser = asyncHandler(async (req, res) =>{
    // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie

    const {email, username, password} = req.body
    console.log(email);

    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }
    
    // Here is an alternative of above code based on logic discussed in video:
    // if (!(username || email)) {
    //     throw new ApiError(400, "username or email is required")
        
    // }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

   const isPasswordValid = await user.isPasswordCorrect(password)

   if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials")
    }

   const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
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

// the below method is for frontend (generally after expiry of access token we need to refresh it using refresh token so that user dont need to login again and again )
const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refresToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized request")
    }
    try {
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken._id)
    
        if(!user){
            throw new ApiError(401,"Invalid Refresh token")
        }
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401,"Refresh Token is expired or used")
        }
        const options = {
        httpOnly : true,
        secure : true
       }
       const {accessToken,newrefreshToken} = await generateAccessAndRefereshTokens(user._id)
    
       return res
       .status(200)
       .cookie("accessToken",accessToken,options)
       .cookie("refreshToken",newrefreshToken,options)
       .json(
        new ApiResponse(
            200,
            {accessToken,refreshToken:newrefreshToken},
            "Access Token refreshed success"
        )
       )
    } catch (error) {
        throw new ApiError(401,error?.message || "Inavlid refresh Token")
    }
})


const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword} = req.body
    // we can also add a field of confirm password mainly its done on frontend part 

    const user = await User.findById(req.user?._id)
    await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError (400,"Invalid Old Password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave:false})


    return res.status(200).json(new ApiResponse(200,{}, "Password changed successfully"))
    
})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200).json(200
        ,req.user
        ,"User Fetched Successfully"
    )
})

const updateAccountDetail = asyncHandler(async(req,res)=>{
    const {fullName,email} =  req.body
    // agr file update krani h to we have to make different controllers
    if(!fullName || !email){
        throw new ApiError(400,"These Fields Are required")
    }
     const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                fullName : fullName,
                email : email
            }
        },
        {
            new:true
        }
    ).select("-password")

    return res.status(200).json(new ApiResponse(200,user,"account details updated successfully"))
    
})

const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path  //req.file thru multer middleware
    // we can also save this avatarLocalPath directly to data base in case we are not using cloudinary 
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)

    //TODO: delete old avatar from cloudinary (make a utility function for this)

    if(!avatar.url){
        throw new ApiError(400,"Error while uploading avatar")
    }

    const user = await User.findById(req.user._id).select("avatar");

    const avatarToDelete = user.avatar.public_id;

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: {
                    public_id: avatar.public_id,
                    url: avatar.secure_url
                }
            }
        },
        { new: true }
    ).select("-password");

    if (avatarToDelete && updatedUser.avatar.public_id) {
        await deleteOnCloudinary(avatarToDelete);
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar image updated successfully")
    )
    //TODO:after updating the avatar delete old avatar from cloudinary (make a utility function for this)
})
const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path  //req.file thru multer middleware
    // we can also save this avatarLocalPath directly to data base in case we are not using cloudinary 
    if(!coverImageLocalPath){
        throw new ApiError(400,"CoverImage file is required")
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading cover Image")
    }

    const user = await User.findById(req.user._id).select("coverImage");

    const coverImageToDelete = user.coverImage.public_id;

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: {
                    public_id: coverImage.public_id,
                    url: coverImage.secure_url
                }
            }
        },
        { new: true }
    ).select("-password");

    if (coverImageToDelete && updatedUser.coverImage.public_id) {
        await deleteOnCloudinary(coverImageToDelete);
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover image updated successfully")
    )
})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const {username} = req.params
    if(!username?.trim()){
        throw new ApiError(400,"Username is missing")
    }
    /* 
    we can also use this to find user and then implement the aggregation pipeline to get the user channel profile
    User.find({username}) 
    */

    //better way using match because match can do it in one go

    const channel = await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",//to join with
                localField:"_id",//field from current model
                foreignField:"channel",//field from where to match
                as:"subscribers"//alias(array of object) of joined data
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                channelSubscribedToCount:{
                    $size:"$subcribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                fullName:1,
                username:1,
                avatar:1,
                coverImage:1,
                subscribersCount:1,
                channelSubscribedToCount:1
            }
        }
    ])
    //this channel will be an array of objects(promises)

    if(!channel?.length){
        throw new ApiError(404,"Channel Not Found")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            channel[0],
            "User Channel Fetched Successfully"
        )
    )

   
})

const getWatchHistory = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            $match:{
                //_id:req.user?._id  -> this is wrong because here mongoose not able to inject ObjectID
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])


    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "User History fetched successfully"
        )

    )
})



 

export {registerUser
    ,loginUser
    ,logoutUser
    ,refreshAccessToken
    ,changeCurrentPassword
    ,getCurrentUser
    ,updateAccountDetail
    ,updateUserAvatar
    ,updateUserCoverImage
    ,getUserChannelProfile
    ,getWatchHistory
}


