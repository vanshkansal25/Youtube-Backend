import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async(req,res)=>{
    const userId = req.user?._id;
    const totalSubscribers = await Subscription.aggregate([
        {
            $match : {
                channel : new mongoose.Types.ObjectId(userId)
            }
        },{
            //The $group stage combines multiple documents with the same field, fields, or expression into a single
            //  document according to a group key. The result is one document per unique group key
            $group : {
                _id: null,// It means: "group everything together" — no grouping by any specific field.
                subscriberCount:{
                    $sum:1
                }
            }
        }
    ])
    const video = await Video.aggregate([
        {
            $match:{
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"video",
                as:"likes"
            }
        },
        {
            $project:{
                 totalLikes: {
                    $size: "$likes"
                },
                totalViews: "$views",
                totalVideos: 1
            }
        },
        {
            $group:{
                _id:null,
                totalLikes:{
                    $sum:"$totalLikes"
                },
                totalViews:{
                    $sum:"$totalViews"
                },
                totalVideos:{
                    $sum : 1
                }
            }
        }
    ])

    const channelStats = {
        totalSubscribers:totalSubscribers[0]?.subscriberCount||0,
        totalLikes:video[0]?.totalLikes||0,
        totalVideos:video[0]?.totalVideos||0,
        totalViews:video[0]?.totalViews||0
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            channelStats,
            "Statistics fetched successfully"
        )
    )


})
const getChannelVideos = asyncHandler(async(req,res)=>{
    const userId = req.user?._id

    const video = Video.aggregate([
        {
            $match:{
                video: new mongoose.Types.ObjectId(userId)
            }
        },{
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"video",
                as:"likes"
            }
        },{
            $addFields:{
                createdAt:{
                    $dateToParts:{date:"$createdAt"}
                },
                likesCount:{
                    $size: "$likes"
                },
            }
        },
        {
            $sort:{
                createdAt : -1
            }
        },
        {
            $project:{
                _id:1,
                "videoFile.url":1,// directly return url not neccessary to return object here
                "thumbnail.url":1,
                title:1,
                description:1,
                createdAt:{
                    year:1,
                    month:1,
                    day:1
                },
                isPublished:1,
                likesCount:1
            }
        }
    ])


    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video,
            "Videos Fetched Successfully"
        )
    )
})

export {
    getChannelStats, 
    getChannelVideos
    }