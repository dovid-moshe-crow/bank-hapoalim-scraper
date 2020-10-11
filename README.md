# bank-hapoalim-scraper

## Scrape data from bank hapoalim

# Usage

```javascript
import { setup, close, getAccountData } from "bank-hapoalim-scraper";

async () => {
  const headless = true;
  await setup(headless);
  const credentials = {
    userCode: "########",
    password: "########",
  };

  const result = await getAccountData(credentials);
  console.log(result);
  await close();
};
```
