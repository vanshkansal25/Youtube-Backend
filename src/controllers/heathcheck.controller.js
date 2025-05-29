
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const healthcheck = asyncHandler(async (req, res) => {
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                message:"HEALTH IS GOOD"
            },
            "ok"
        )
    )
})

export {
    healthcheck
    }
    