const exchangeRatesCache = {};

// Function to fetch exchange rate for a given date
async function fetchExchangeRate(date) {
  if (exchangeRatesCache[date]) {
    return exchangeRatesCache[date];
  }
  try {
    const response = await fetch(`https://api.nbrb.by/exrates/rates?periodicity=0&ondate=${date}`);
    const rates = await response.json();
    const usdRate = rates.find(rate => rate.Cur_Abbreviation === 'USD');
    exchangeRatesCache[date] = usdRate ? usdRate.Cur_OfficialRate : null;
    return exchangeRatesCache[date];
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
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

  for (const part of parts) {
    const usdRate = await fetchExchangeRate(part.purchaseDate);
    if (usdRate !== null) {
      const usdPrice = (part.price / usdRate).toFixed(2);
      const totalUSDPrice = (usdPrice * part.amount).toFixed(2);
      totalBuildCostUSD += parseFloat(totalUSDPrice);

      let nameContent = `<a href="${part.url}" target="_blank">${part.name}</a>`;
      if (part.isUsed) {
        nameContent += `<span class="svg-icon" data-toggle="tooltip" data-placement="top" title="Бывший в употреблении"></span>`;
      }

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${nameContent}</td>
        <td class="text-center">${printLocalDate(part.purchaseDate)}</td>
        <td>${formatPrice(part)} ($${usdPrice})</td>
        <td class="text-center">${part.amount}</td>
        <td>$${totalUSDPrice}</td>
      `;
      tableBody.appendChild(row);
    }
  }

  // Add a row for the total build cost
  totalBuildCostElement.innerHTML = `
    <tr>
      <td colspan="4" class="text-right"><strong>Итого:</strong></td>
      <td><strong>$${totalBuildCostUSD.toFixed(2)}</strong></td>
    </tr>
  `;
}

