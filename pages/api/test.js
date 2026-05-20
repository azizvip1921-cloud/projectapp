import data from "@/lib/data";

export default  async function handler(req,res){
    try{
        const[rows]= await data.query("SELECT 1 ");
        res.status(200).json({message:"DB connection syccessful", rows});
    
    }catch(error){
        console.error("Database connection error:",error);
        res.status(500).json({message:"DB connection failed",error:error.message});
    }
}