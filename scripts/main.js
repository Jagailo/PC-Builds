const exchangeRatesCache = {
  BYN: {},
  EUR: {}
};

async function getCurrentBYNRate() {
  const today = new Date().toISOString().split('T')[0];
  return await fetchBYNtoUSD(today);
}

// Function to fetch EUR to USD exchange rate
async function fetchEURtoUSD(date) {
  if (exchangeRatesCache.EUR[date]) {
    return exchangeRatesCache.EUR[date];
  }

  try {
    const response = await fetch(`https://api.frankfurter.app/${date}?from=EUR&to=USD`);
    const data = await response.json();
    exchangeRatesCache.EUR[date] = data.rates.USD;
    return exchangeRatesCache.EUR[date];
  } catch (error) {
    console.error('Error fetching EUR to USD rate:', error);
    return null;
  }
}

// Function to fetch BYN exchange rate
async function fetchBYNtoUSD(date) {
  if (exchangeRatesCache.BYN[date]) {
    return exchangeRatesCache.BYN[date];
  }

  try {
    const response = await fetch(`https://api.nbrb.by/exrates/rates?periodicity=0&ondate=${date}`);
    const rates = await response.json();
    const usdRate = rates.find(rate => rate.Cur_Abbreviation === 'USD');
    exchangeRatesCache.BYN[date] = usdRate ? usdRate.Cur_OfficialRate : null;
    return exchangeRatesCache.BYN[date];
  } catch (error) {
    console.error('Error fetching BYN to USD rate:', error);
    return null;
  }
}

// Combined function to get exchange rate based on currency
async function getExchangeRate(date, currency) {
  switch (currency) {
    case 'BYN':
      return await fetchBYNtoUSD(date);
    case 'EUR':
      return await fetchEURtoUSD(date);
    case 'USD':
      return 1; // No conversion needed
    default:
      return null;
  }
}

// Function to display date
function printLocalDate(dateString) {
  const date = new Date(dateString);
  if (isNaN(date)) {
    console.error('Invalid date format!');
    return;
  }

  return date.toLocaleDateString();
}

function formatPrice(item) {
  let formattedPrice = '';

  switch (item.currency) {
    case 'BYN':
      formattedPrice = item.price.toFixed(2) + ' р.';
      break;
    case 'USD':
      formattedPrice = '$' + item.price.toFixed(2);
      break;
    case 'EUR':
      formattedPrice = '€' + item.price.toFixed(2);
      break;
    default:
      formattedPrice = item.price.toFixed(2);
  }

  return formattedPrice;
}

// Function to load JSON data
async function loadBuildData(jsonUrl) {
  try {
    const response = await fetch(jsonUrl);
    const data = await response.json();

    document.title = data.name;
    document.getElementById('build-title').textContent = data.name;

    return data.parts;
  } catch (error) {
    console.error('Error loading build data:', error);
    return [];
  }
}

// Function to render html
async function renderBuild(jsonUrl) {
  const parts = await loadBuildData(jsonUrl);
  const tableBody = document.getElementById('parts-table-body');
  const totalBuildCostElement = document.getElementById('total-build-cost');
  let totalBuildCostUSD = 0;

  // Get current BYN rate once for all items
  const currentBYNRate = await getCurrentBYNRate();

  for (const part of parts) {
    const rate = await getExchangeRate(part.purchaseDate, part.currency);

    if (rate !== null) {
      let usdPrice;
      if (part.currency === 'USD') {
        usdPrice = part.price;
      } else if (part.currency === 'EUR') {
        usdPrice = part.price * rate;
      } else { // BYN
        usdPrice = part.price / rate;
      }

      const totalUSDPrice = (usdPrice * part.amount).toFixed(2);
      totalBuildCostUSD += parseFloat(totalUSDPrice);

      // Calculate current BYN price
      const currentBYNPrice = (usdPrice * currentBYNRate).toFixed(2);

      let nameContent = `<a href="${part.url}" target="_blank">${part.name}</a>`;
      if (part.isUsed) {
        nameContent += `<span class="svg-icon" data-toggle="tooltip" data-placement="top" title="Бывший в употреблении"></span>`;
      }

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${nameContent}</td>
        <td class="text-center">${printLocalDate(part.purchaseDate)}</td>
        <td>
          ${formatPrice(part)} 
          <span class="usd-price" data-toggle="tooltip" data-placement="top" title="${currentBYNPrice} р.">($${usdPrice.toFixed(2)})</span>
        </td>
        <td class="text-center">${part.amount}</td>
        <td>$${totalUSDPrice}</td>
      `;
      tableBody.appendChild(row);
    }
  }

  const totalBYNPrice = (totalBuildCostUSD * currentBYNRate).toFixed(2);

  totalBuildCostElement.innerHTML = `
    <tr>
      <td colspan="4" class="text-right"><strong>Итого:</strong></td>
      <td><strong><span class="usd-price" data-toggle="tooltip" data-placement="top" title="${totalBYNPrice} р.">$${totalBuildCostUSD.toFixed(2)}</span></strong></td>
    </tr>
  `;
}

