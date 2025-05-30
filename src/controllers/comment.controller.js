import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {Video} from "../models/video.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(400,"Video Not found")
    }
    const comments = await Comment.aggregate([
        {
            $match : {
                video : new mongoose.Types.ObjectId(videoId)
            }
        },{
            // Perform a lookup to get user details from the "users" collection who comment on the video
            $lookup : {
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner"
            }
        },
        {
            // Perform a lookup to get likes associated with each comment from the "likes" model
            $lookup : {
                from:"likes",
                localField:"_id",
                foreignField:"comment",
                as:"likes"
            }
        },
        {
            $addFields:{
                CommentLikes:{
                    $size : "$likes"
                },
                owner: {
                    $first : "$owner"
                },
                // to check if the current user liked the comment or not
                isLiked : {
                    $cond:{
                        $if:{$in:[req.user?._id,"$likes.likedBy"]
                        },
                        then : true,
                        else: false
                    },
                },
            },
        },
        {
            $project:{
                content : 1,
                createdt: 1,
                likesCount: 1,
                owner:{
                    avatar : 1,
                    username :1 ,
                    fullName : 1
                },
                isLiked:1
            }
        }
    ])

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    };
    const comment = await Comment.aggregatePaginate(
        comments,
        options
    );
    return res.status(200).json(
        new ApiResponse(200,comment,"Comments Fetched Successfully")
    )
})

const addComment = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const {content} = req.body

    if(!content){
        throw new ApiError(400,"Add some content")
    }
    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(400,"Video Not found")
    }

     const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user?._id,
    });

    if (!comment) {
        throw new ApiError(500, "Failed to add comment please try again");
    }

    return res
        .status(201)
        .json(new ApiResponse(201, comment, "Comment added successfully"));
})

const updateComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    const {content} = req.body

    if(!content){
        throw new ApiError(401,"Comment is required")
    }
    const comment = await Comment.findById(commentId)
    if(!comment){
        throw new ApiError(401,"Comment not found")
    }

    if (comment?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Only comment owner can edit their comment");
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        comment?._id,
        {$set:{
                content,
        }},
        {
            new: true,
        }
    )

    if(!updatedComment){
        throw new ApiError(500,"Failed to update the comment")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedComment, "Comment edited successfully")
        );
 })

const deleteComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params

    const comment = await Comment.findById(commentId)

    if(!comment){
        throw new ApiError(401,"Comment not found")
    }

    if (comment?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Only comment owner can delete their comment");
    }

    await Comment.findByIdAndDelete(commentId)
    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Comment deleted successfully")
        );
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }