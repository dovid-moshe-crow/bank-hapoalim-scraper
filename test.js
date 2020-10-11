async function t(){
  for (let index = 0; index < 20; index++) {
     if(index == 10){
         throw new Error("heell");
     }
     console.log(index);
  }
}

(async() => {
    console.log("hello");
    await t()
    console.log("end");
})()
