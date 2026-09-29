// Run this function using Playwright MCP browser_run_code_unsafe.filename.
// Serve the repository root locally and first navigate to /dist/.
// This fixture never signs or broadcasts a transaction; run without a real wallet.
async (page) => {
  const results = [];
  const check = (condition, name) => { if (!condition) throw new Error(name); results.push(name); };
  const waitText = (text) => page.getByText(text, {exact:false}).first().waitFor({state:'visible',timeout:20000});
  const dialog = () => page.getByRole('dialog');
  const review = async (amount) => {
    await page.locator('#amount').fill(amount);
    await page.getByRole('button',{name:'Review swap',exact:true}).waitFor({timeout:20000});
    await page.getByRole('button',{name:'Review swap',exact:true}).click();
  };
  const base = new URL('./', page.url()).href;
  await page.goto(base);
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  check(!await page.evaluate(() => !!window.ethereum), 'isolated browser has no real wallet');
  await page.locator('form').getByRole('button',{name:'Connect wallet',exact:true}).click();
  await page.getByRole('button',{name:/Connect browser wallet/}).click();
  await waitText('No browser wallet found.');
  check(true, 'missing wallet has recovery instructions');
  await page.keyboard.press('Escape');
  // Check native dialog keyboard focus and radio behavior.
  await page.getByRole('button',{name:'Swap settings',exact:true}).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('radio',{name:'0.5% Default',exact:true}).focus();
  await page.keyboard.press('ArrowRight');
  check(await page.getByRole('radio',{name:'1%',exact:true}).isChecked(), 'slippage radio keyboard selection');
  await page.getByRole('button',{name:'Save settings',exact:true}).click();
  check(await page.getByRole('button',{name:'Swap settings',exact:true}).evaluate(el=>el===document.activeElement), 'dialog restores focus to trigger');
  // Install local wallet fixture explicitly; never part of dist.
  await page.evaluate(async () => { const source = await fetch('../test/wallet-fixture.js').then(r=>r.text()); (0,eval)(source); });
  await page.locator('form').getByRole('button',{name:'Connect wallet',exact:true}).click();
  await page.getByRole('button',{name:/Connect browser wallet/}).click();
  await page.getByRole('button',{name:'Switch to Ethereum',exact:true}).click();
  await page.waitForFunction(()=>window.__imdTest.chain==='0x1');
  check(true,'wallet connection and mainnet switch');
  await page.locator('#amount').fill('-1');
  await page.locator('#amount').press('Enter');
  check(await page.locator('#amount').getAttribute('aria-invalid') === 'true' && await page.locator('#amount').evaluate(el=>el===document.activeElement),'invalid amount error and focus');
  await review('0.01');
  await page.evaluate(()=>window.__imdTest.rejectSend=true);
  await dialog().getByRole('button',{name:'Confirm swap',exact:true}).click();
  await waitText('Request declined in your wallet.');
  check(await page.evaluate(()=>window.__imdTest.transactions.length)===0,'wallet rejection submits no transaction');
  await page.evaluate(()=>{window.__imdTest.rejectSend=false;window.__imdTest.holdSend=true;});
  const minimumBefore = await dialog().locator('.review-details').innerText();
  await dialog().getByRole('button',{name:'Confirm swap',exact:true}).click();
  await page.waitForFunction(()=>typeof window.__imdTest.releaseSend==='function');
  await page.evaluate(()=>{window.__realNow=Date.now;Date.now=()=>window.__realNow()+31000;});
  await page.waitForFunction(()=>document.querySelector('.receive-panel').innerText.includes('Quote expired'));
  check(await dialog().getByRole('button',{name:'Check your wallet…',exact:true}).isDisabled(),'expired quote cannot refresh during wallet signing');
  check(await dialog().locator('.review-details').innerText()===minimumBefore,'reviewed amounts preserved during delayed signing');
  await page.evaluate(()=>{Date.now=window.__realNow;window.__imdTest.holdSend=false;window.__imdTest.releaseSend();});
  await waitText('Swap confirmed on Ethereum.');
  check(true,'fixture buy reaches confirmed receipt');
  await page.getByRole('button',{name:'Sell IMD',exact:true}).click();
  check(await page.locator('#amount').inputValue()==='','direction change clears input');
  await review('10');
  await dialog().getByRole('button',{name:'Approve IMD amount',exact:true}).click();
  await dialog().getByRole('button',{name:'Approve router amount',exact:true}).waitFor({timeout:20000});
  await dialog().getByRole('button',{name:'Approve router amount',exact:true}).click();
  await dialog().getByRole('button',{name:'Confirm swap',exact:true}).waitFor({timeout:20000});
  await dialog().getByRole('button',{name:'Confirm swap',exact:true}).click();
  await waitText('Swap confirmed on Ethereum.');
  check(await page.evaluate(()=>window.__imdTest.approvedToken===10n*10n**18n && window.__imdTest.approvedRouter===10n*10n**18n),'both sell approvals limited to exact entered amount');
  const txs = await page.evaluate(()=>window.__imdTest.transactions);
  check(txs.length===4 && txs[3].to.toLowerCase()==='0x66a9893cc07d91d95644aedd05d03f95e1dba8af' && BigInt(txs[3].value||'0x0')===0n,'sell uses configured router with no native input');
  await page.getByRole('button',{name:'Buy IMD',exact:true}).click();
  await review('0.02');
  // Failed quote refresh must be visible in the open review dialog.
  await page.evaluate(()=>{window.__imdTest.failReads=true;window.__realNow=Date.now;Date.now=()=>window.__realNow()+31000;});
  await dialog().getByRole('button',{name:'Refresh expired quote',exact:true}).click();
  await dialog().getByText('Quote unavailable', {exact:false}).waitFor({timeout:20000});
  check(await dialog().getByText(/Couldn’t get a live quote/).isVisible(),'review displays failed quote and recovery');
  await page.evaluate(()=>{window.__imdTest.failReads=false;});
  await dialog().getByRole('button',{name:'Retry quote',exact:true}).click();
  await dialog().getByRole('button',{name:'Confirm swap',exact:true}).waitFor({timeout:20000});
  await page.evaluate(()=>window.__imdTest.receipt='reverted');
  await dialog().getByRole('button',{name:'Confirm swap',exact:true}).click();
  await waitText('Transaction reverted.');
  check(true,'reverted receipt produces error, not success');
  await page.evaluate(()=>{Date.now=window.__realNow;window.__imdTest.receipt='success';window.__imdTest.emit('accountsChanged',['0x2222222222222222222222222222222222222222']);});
  await dialog().waitFor({state:'detached'});
  check(true,'account change closes stale review');
  // Simulate a reload with a hash whose replacement cannot be discovered.
  const hash='0x'+'9'.repeat(64);
  await page.evaluate(hash=>sessionStorage.setItem('imd.pending',JSON.stringify({hash,kind:'swap'})),hash);
  await page.reload();
  check(await page.locator('#amount').isDisabled(),'reloaded pending transaction locks new trades');
  await page.getByRole('button',{name:'Manage pending transaction',exact:true}).click();
  check(await dialog().getByRole('button',{name:'Stop tracking transaction',exact:true}).isDisabled(),'stop tracking requires acknowledgment');
  check((await dialog().getByRole('link').getAttribute('href')).endsWith(hash),'recovery links exact transaction');
  await dialog().getByRole('checkbox').check();
  await dialog().getByRole('button',{name:'Stop tracking transaction',exact:true}).click();
  check(!await page.locator('#amount').isDisabled(),'acknowledged recovery unlocks form');
  check(await page.evaluate(()=>sessionStorage.getItem('imd.pending'))===null,'recovery clears persisted pending state');
  check((await page.locator('.global-feedback').innerText()).includes('may still confirm'),'recovery does not imply cancellation');
  return {passed:results.length,checks:results,transactions:txs.map(t=>({to:t.to,value:t.value||'0x0',selector:t.data.slice(0,10)}))};
}
