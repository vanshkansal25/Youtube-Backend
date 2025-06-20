import mongoose ,{Schema} from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
const userSchema = new Schema({
    username:{
        type: String,
        required : true,
        unique : true,
        lowercase : true,
        trim : true,
        index : true // to make this field searchable in db
    },
    email:{
        type: String,
        required : true,
        unique : true,
        lowercase : true,
        trim : true
    },
    fullName:{
        type: String,
        required : true,
        trim : true,
        index : true
    },
    avatar: {
            type: {
                public_id: String,
                url: String //cloudinary url
            },
            required: true
        },
        coverImage: {
            type: {
                public_id: String,
                url: String //cloudinary url
            },
        },
    watchHistory:[
        {
           type : Schema.Types.ObjectId,
           ref:"Video"
        }
    ],
    password:{
        type: String,
        required:[true,"Password is Required"]
    },
    refreshToken:{
        type : String
    }
},
{
    timestamps:true
}
)

userSchema.pre("save",async function(next){
    if(!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password,10)
    next()
})

userSchema.methods.isPasswordCorrect = async function(password){
   return await bcrypt.compare(password,this.password)
}
// error befaltu m async lgaya aur krdiye 30 min khrab
// userSchema.methods.generateAccessToken = async function(){
//     return jwt.sign(
//         {
//             _id : this._id,
//             email:this.email,
//             username:this.username,
//             fullName:this.fullName

//         },
//         process.env.ACCESS_TOKEN_SECRET,
//         {
//             expiresIn : process.env.ACCESS_TOKEN_EXPIRY
//         }
//     )
// }
userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id : this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn : process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}


export const User = mongoose.model("User",userSchema)