(function(){
  function addReprintButtons(){
    const rows=document.querySelectorAll('#reportRows tr');
    rows.forEach(row=>{
      if(row.dataset.reprintReady==='1') return;
      const cells=row.querySelectorAll('td');
      if(cells.length<7) return;
      const billNo=cells[1].textContent.trim();
      if(!billNo || billNo==='—') return;
      const actions=cells[6];
      if(!actions) return;
      const bill=bills.find(x=>String(x.no)===billNo);
      if(!bill) return;

      const billBtn=document.createElement('button');
      billBtn.className='btn orange';
      billBtn.textContent='Print Bill';
      billBtn.onclick=function(){openPrint(receiptHTML(bill),function(){toast('Bill reprinted.')})};
      actions.appendChild(document.createTextNode(' '));
      actions.appendChild(billBtn);

      const kot=bill.kotNo
        ? kots.find(function(x){return String(x.no)===String(bill.kotNo)})
        : kots.slice().reverse().find(function(x){
            return x.items && bill.items && x.items.length===bill.items.length &&
              x.items.every(function(ki){return bill.items.some(function(bi){return bi.name===ki.name && Number(bi.qty)===Number(ki.qty)})});
          });
      if(kot){
        const kotBtn=document.createElement('button');
        kotBtn.className='btn blue';
        kotBtn.textContent='Print KOT';
        kotBtn.onclick=function(){openPrint(kotHTML(kot),function(){toast('KOT reprinted.')})};
        actions.appendChild(document.createTextNode(' '));
        actions.appendChild(kotBtn);
      }
      row.dataset.reprintReady='1';
    });
  }

  // Print KOT + Bill as ONE browser print job with two separate pages.
  // Page 1 = KOT, page 2 = Bill. This avoids Chrome blocking a second
  // print window. Browser CSS creates the page break; a physical ESC/POS
  // cutter still requires a compatible print bridge/driver.
  function installPrintFix(){
    if(typeof window.printKotAndBill!=='function') return;

    window.printKotAndBill=function(){
      const b=buildBill();
      if(!b)return;
      const k=makeKot(b);

      const stripScripts=function(html){
        return html.replace(/<script[\s\S]*?<\/script>/gi,'');
      };

      const kot=stripScripts(kotHTML(k));
      const bill=stripScripts(receiptHTML(b));

      const combined='<!doctype html><html><head><meta charset="utf-8"><title>Swadistha KOT + Bill</title><style>'+
        '@page{margin:0}html,body{margin:0;padding:0;background:#fff}.print-page{page-break-after:always;break-after:page;width:100%;}.print-page:last-child{page-break-after:auto;break-after:auto}'+
        '</style></head><body>'+
        '<section class="print-page">'+kot+'</section>'+
        '<section class="print-page">'+bill+'</section>'+
        '</body></html>';

      const w=window.open('','_blank','width=420,height=720');
      if(!w){
        toast('Allow popups for printing. Bill was not saved.');
        return;
      }

      w.document.open();
      w.document.write(combined);
      w.document.close();

      const printNow=function(){
        try{
          w.focus();
          w.print();
          consumeBill(b);
          toast('KOT + Bill print job sent. New bill is ready.');
        }catch(e){
          toast('Printing could not be started. Bill was not saved.');
        }
      };

      if(w.document.readyState==='complete'){
        setTimeout(printNow,100);
      }else{
        w.onload=function(){setTimeout(printNow,100)};
      }
    };
  }

  const oldRenderReports=window.renderReports;
  if(typeof oldRenderReports==='function'){
    window.renderReports=function(){oldRenderReports();addReprintButtons()};
  }

  document.addEventListener('DOMContentLoaded',function(){
    installPrintFix();
    addReprintButtons();
    new MutationObserver(function(){
      addReprintButtons();
      installPrintFix();
    }).observe(document.body,{childList:true,subtree:true});
  });
})();
