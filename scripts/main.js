const exchangeRatesCache = new Map();

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url}`);
  }

  return response.json();
}

// Caches promises rather than values so that parallel requests for the same date share a single fetch
function getCachedRate(key, fetchRate) {
  if (!exchangeRatesCache.has(key)) {
    exchangeRatesCache.set(key, fetchRate().catch(error => {
      console.error(`Error fetching ${key} rate:`, error);
      return null;
    }));
  }

  return exchangeRatesCache.get(key);
}

function getBYNPerUSD(date) {
  return getCachedRate(`BYN:${date}`, async () => {
    const rates = await fetchJson(`https://api.nbrb.by/exrates/rates?periodicity=0&ondate=${date}`);
    return rates.find(rate => rate.Cur_Abbreviation === 'USD')?.Cur_OfficialRate ?? null;
  });
}

function getUSDPerEUR(date) {
  return getCachedRate(`EUR:${date}`, async () => {
    const data = await fetchJson(`https://api.frankfurter.dev/v1/${date}?from=EUR&to=USD`);
    return data.rates?.USD ?? null;
  });
}

async function convertToUSD(price, currency, date) {
  switch (currency) {
    case 'USD':
      return price;
    case 'EUR': {
      const rate = await getUSDPerEUR(date);
      return rate ? price * rate : null;
    }
    case 'BYN': {
      const rate = await getBYNPerUSD(date);
      return rate ? price / rate : null;
    }
    default:
      return null;
  }
}

function printLocalDate(dateString) {
  const date = new Date(dateString);
  if (isNaN(date)) {
    console.error('Invalid date format!');
    return '';
  }

  // Date-only ISO strings are parsed as UTC midnight, so formatting in UTC keeps the day from shifting
  return date.toLocaleDateString('ru-RU', { timeZone: 'UTC' });
}

function formatPrice(item) {
  const price = item.price.toFixed(2);
  switch (item.currency) {
    case 'BYN':
      return `${price} р.`;
    case 'USD':
      return `$${price}`;
    case 'EUR':
      return `€${price}`;
    default:
      return price;
  }
}

function withTooltip(content, tooltip) {
  return `<span class="usd-price" data-bs-toggle="tooltip" data-bs-placement="bottom" title="${tooltip}">${content}</span>`;
}

async function loadBuildData(jsonUrl) {
  try {
    const data = await fetchJson(jsonUrl);

    document.title = data.name;
    document.getElementById('build-title').textContent = data.name;

    return data.parts;
  } catch (error) {
    console.error('Error loading build data:', error);
    return [];
  }
}

async function renderBuild(jsonUrl) {
  const today = new Date().toISOString().split('T')[0];
  const [parts, currentBYNRate] = await Promise.all([loadBuildData(jsonUrl), getBYNPerUSD(today)]);
  parts.sort((a, b) => a.order - b.order);

  const usdPrices = await Promise.all(parts.map(part => convertToUSD(part.price, part.currency, part.purchaseDate)));

  const toBYNTooltip = usdPrice => currentBYNRate ? `${(usdPrice * currentBYNRate).toFixed(2)} р.` : 'Курс BYN недоступен';
  const unavailable = withTooltip('недоступно', 'Не удалось получить курс на дату покупки');

  const tableBody = document.getElementById('parts-table-body');
  let totalBuildCostUSD = 0;
  let hasUnavailableParts = false;

  parts.forEach((part, index) => {
    const usdPrice = usdPrices[index];

    let nameContent = `<a href="${part.url}" target="_blank">${part.name}</a>`;
    if (part.isUsed) {
      nameContent += `<span class="svg-icon" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Бывший в употреблении"></span>`;
    }

    let priceContent;
    let totalContent;
    if (part.price === 0) {
      priceContent = '0';
      totalContent = '0';
    } else if (usdPrice === null) {
      hasUnavailableParts = true;
      priceContent = formatPrice(part);
      totalContent = unavailable;
    } else {
      const totalUSDPrice = parseFloat((usdPrice * part.amount).toFixed(2));
      totalBuildCostUSD += totalUSDPrice;

      priceContent = part.currency === 'USD'
        ? withTooltip(formatPrice(part), toBYNTooltip(usdPrice))
        : `${formatPrice(part)} ${withTooltip(`($${usdPrice.toFixed(2)})`, toBYNTooltip(usdPrice))}`;
      totalContent = `$${totalUSDPrice.toFixed(2)}`;
    }

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${nameContent}</td>
      <td class="text-center">${printLocalDate(part.purchaseDate)}</td>
      <td class="text-center">${priceContent}</td>
      <td class="text-center">${part.amount}</td>
      <td class="text-center">${totalContent}</td>
    `;

    tableBody.appendChild(row);
  });

  const totalLabel = hasUnavailableParts ? 'Итого (без учёта недоступных позиций):' : 'Итого:';

  document.getElementById('total-build-cost').innerHTML = `
    <tr>
      <td colspan="4" class="text-end"><strong>${totalLabel}</strong></td>
      <td class="text-center"><strong>${withTooltip(`$${totalBuildCostUSD.toFixed(2)}`, toBYNTooltip(totalBuildCostUSD))}</strong></td>
    </tr>
  `;

  initializeTooltips();
}

function initializeTooltips() {
  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
}
