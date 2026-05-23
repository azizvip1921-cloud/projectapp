const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  
  await page.goto('http://localhost:3000/employee-salaries');
  await page.waitForTimeout(4000);
  
  const rows = await page.$$('tbody tr');
  console.log('Rows found:', rows.length);
  await page.screenshot({ path: '/tmp/step1_initial.png' });
  
  if (rows.length > 0) {
    // Click second cell (employee name/avatar)
    const nameCell = await page.$('tbody tr:first-child td:nth-child(2)');
    if (nameCell) {
      const txt = await nameCell.textContent();
      console.log('Clicking name cell:', txt?.trim().slice(0,30));
      await nameCell.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: '/tmp/step2_after_cell_click.png' });
      const back = await page.$('.pay-btn-back');
      const header = await page.$('.pay-emp-header');
      console.log('RESULT: back btn =', !!back, ', emp header =', !!header);
      if (!back) console.log('FAIL: cell click did NOT navigate');
      else console.log('PASS: cell click DID navigate');
    }
  }
  
  await browser.close();
})();
