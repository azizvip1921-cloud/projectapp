import data from "@/lib/data";

export default async function handler(req,res){
    if(req.method ==='POST'){
        try {     
            const{ name, number, email}= req.body;
            const[result]= await data.query('INSERT INTO employee (name, number, email) VALUES (?,?,?)',[name,number,email]);
            res.status(201).json({ success:true, message:'User added', id: result.insertId});
        } catch (error) {
            console.error('database:', error);
            res.status(500).json({ success:false, message:'Error adding user', error: error.message});     
    }  }else{
        res.status(405).json({ message:'Method not allowed'});
    }               

}