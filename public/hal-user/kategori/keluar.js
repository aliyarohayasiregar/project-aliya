const tombol=document.keluar;
tombol.onclick = ()=>{
  fetch("/api/keluar").then((response)=>{
    if(response.ok){
      location.href="../hal-utama"
    }
  })
}