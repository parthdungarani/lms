// Leaf module for visitor-side localization helpers (currency + timezone).
// Kept dependency-light (only dayjs) so components can import it without pulling
// in the heavy '@/utils' barrel and risking an import cycle.
import dayjs from '@/utils/dayjs'

// Format an amount with the ISO currency CODE (e.g. "CAD 450") instead of a bare
// symbol, so paid batches read unambiguously across countries.
export function formatCurrencyWithCode(number, currency) {
	if (number == null || number === '' || !currency) return ''
	return Number(number).toLocaleString('en-IN', {
		maximumFractionDigits: 0,
		style: 'currency',
		currency: currency,
		currencyDisplay: 'code',
	})
}

// The visitor's own IANA timezone, straight from the browser.
export function getBrowserTimezone() {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone
	} catch (e) {
		return null
	}
}

// Short timezone abbreviation (e.g. "IST", "EST") for a zone at a given instant.
export function getTimezoneAbbr(timezone, dateObj) {
	try {
		const parts = new Intl.DateTimeFormat('en-US', {
			timeZone: timezone,
			timeZoneName: 'short',
		}).formatToParts(dateObj || new Date())
		const part = parts.find((p) => p.type === 'timeZoneName')
		return part ? part.value : timezone
	} catch (e) {
		return timezone
	}
}

// Convert a class time range stored in `sourceTimezone` into the visitor's local
// timezone. `refDate` (the batch start date) anchors the conversion so daylight
// saving is handled for the right time of year. Returns null when it can't convert.
export function localizeTimeRange(startTime, endTime, sourceTimezone, refDate) {
	if (!startTime || !sourceTimezone) return null

	const userTimezone = getBrowserTimezone()
	if (!userTimezone) return null

	const base = refDate ? dayjs(refDate).format('YYYY-MM-DD') : '2024-06-15'

	const start = dayjs.tz(`${base} ${startTime}`, sourceTimezone)
	if (!start.isValid()) return null
	const end = endTime ? dayjs.tz(`${base} ${endTime}`, sourceTimezone) : null

	const localStart = start.tz(userTimezone)
	const localEnd = end ? end.tz(userTimezone) : null

	return {
		userTimezone,
		sameZone: userTimezone === sourceTimezone,
		localStart: localStart.format('h:mm A'),
		localEnd: localEnd ? localEnd.format('h:mm A') : '',
		userAbbr: getTimezoneAbbr(userTimezone, localStart.toDate()),
		sourceStart: start.format('h:mm A'),
		sourceEnd: end ? end.format('h:mm A') : '',
		sourceAbbr: getTimezoneAbbr(sourceTimezone, start.toDate()),
	}
}
