//this is a utility function to handle the async function like db calls or 
// any other such we can just pass it here 


//using promises

const asyncHandler = (requestHandler)=>{
    return (req,res,next)=>{
        Promise
        .resolve(requestHandler(req,res,next))
        .catch((err)=>{next(err)})
    } 
}

export {asyncHandler}












//using try 
//these are higher order function
// const asyncHandler = (fn)=> async (req,res,next) => {
//     try {
//         await fn(req,res,next)
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success : false, // this json response for fontend 
//             message : error.message
//         })
//     }
// }