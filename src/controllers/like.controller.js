import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    if(!isValidObjectId(videoId)){
       // Returns true if Mongoose can cast the given value to an ObjectId, or false otherwise. 
       throw new ApiError(400,"Invalid Videoid")
    }

    const likedAlready = await Like.findById({
        video:videoId,
        likedBy:req.user?._id
    })

    if(likedAlready){
        await Like.findByIdAndDelete(likedAlready?._id)
        return res.status(200).json(new ApiResponse(200,{isLiked : false}))
        //this isLiked for frontend developer to show the liked icon or unliked icon 
    }

    await Like.create({
        video:videoId,
        likedBy:req.user?._id
    })

    return res.status(200).json(new ApiResponse(200,{isLiked : true}))

})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    if(!isValidObjectId(commentId)){
       // Returns true if Mongoose can cast the given value to an ObjectId, or false otherwise. 
       throw new ApiError(400,"Invalid Commentid")
    }

    const likedAlready = await Like.findById({
        comment:commentId,
        likedBy:req.user?._id
    })

    if(likedAlready){
        await Like.findByIdAndDelete(likedAlready?._id)
        return res.status(200).json(new ApiResponse(200,{isLiked : false}))
        //this isLiked for frontend developer to show the liked icon or unliked icon 
    }

    await Like.create({
        comment:commentId,
        likedBy:req.user?._id
    })

    return res.status(200).json(new ApiResponse(200,{isLiked : true}))

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    if(!isValidObjectId(tweetId)){
       // Returns true if Mongoose can cast the given value to an ObjectId, or false otherwise. 
       throw new ApiError(400,"Invalid tweetid")
    }

    const likedAlready = await Like.findById({
        tweet:tweetId,
        likedBy:req.user?._id
    })

    if(likedAlready){
        await Like.findByIdAndDelete(likedAlready?._id)
        return res.status(200).json(new ApiResponse(200,{isLiked : false}))
        //this isLiked for frontend developer to show the liked icon or unliked icon 
    }

    await Like.create({
        tweet:tweetId,
        likedBy:req.user?._id
    })

    return res.status(200).json(new ApiResponse(200,{isLiked : true}))
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    const likedVideosPipeline = await Like.aggregate([
        {
            $match:{
                likedBy: new mongoose.Types.ObjectId(req.user?.id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"video",
                foreignField:"_id",
                as:"likedVideo",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"ownerDetails",
                        }
                    },
                    {
                        $unwind:"$ownerDetails"//unwind to convert the ownerDetails array into a single object.
                    }
                ]
            }
        },
        {
            $unwind:"$likedVideo"
        },
        {
            $sort:{
                createdAt: -1
            }
        },
        {
            $project:{
                likedVideo:{
                    _id: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    owner: 1,
                    title: 1,
                    description: 1,
                    views: 1,
                    duration: 1,
                    createdAt: 1,
                    isPublished: 1,
                    ownerDetails: {
                        username: 1,
                        fullName: 1,
                        "avatar.url": 1,
                    }
                }
            }
        }
    ])

    return res.status(200).json(new ApiResponse(200,likedVideosPipeline,"Liked videos fetched successfully"))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}