<template>
	<div class="flex flex-col space-y-2">
		<div class="flex items-center text-sm text-ink-gray-7">
			<span class="lucide-clock h-4 w-4 me-2 text-ink-gray-7" />
			<span dir="ltr">{{ clockText }}</span>
		</div>
		<div v-if="timezone" class="flex items-center text-sm text-ink-gray-7">
			<span class="lucide-globe h-4 w-4 me-2 text-ink-gray-5" />
			<span>{{ zoneText }}</span>
		</div>
	</div>
</template>

<script setup>
import { computed } from 'vue'
import { formatTime } from '@/utils'
import { localizeTimeRange } from '@/utils/localize'

const props = defineProps({
	startTime: { type: String, default: '' },
	endTime: { type: String, default: '' },
	timezone: { type: String, default: '' },
	date: { type: [String, Object], default: '' },
})

const local = computed(() =>
	localizeTimeRange(props.startTime, props.endTime, props.timezone, props.date)
)

// Primary line: the visitor's own local time when we can convert; otherwise the
// stored time as-is.
const clockText = computed(() => {
	const l = local.value
	if (l && !l.sameZone) {
		return l.localEnd ? `${l.localStart} - ${l.localEnd}` : l.localStart
	}
	return `${formatTime(props.startTime)} - ${formatTime(props.endTime)}`
})

// Secondary line: which zone the primary time is in, plus the original class time
// in its own zone so nothing is ambiguous.
const zoneText = computed(() => {
	const l = local.value
	if (l && !l.sameZone) {
		const original = l.sourceEnd
			? `${l.sourceStart} - ${l.sourceEnd} ${l.sourceAbbr}`
			: `${l.sourceStart} ${l.sourceAbbr}`
		return `${l.userAbbr} · your time · class runs ${original}`
	}
	if (l) return l.sourceAbbr || props.timezone
	return props.timezone
})
</script>
