<template>
	<LayoutHeader>
		<template #left-header>
			<Breadcrumbs :items="breadcrumbs" />
		</template>
	</LayoutHeader>
	<div class="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-10">
		<div class="mb-6">
			<h1 class="text-xl-semibold text-ink-gray-9">
				{{ __('Book a Masterclass Session') }}
			</h1>
			<p class="mt-1 text-p-base text-ink-gray-6">
				{{ __('Pick a day, then a time. Each session is') }}
				{{ sessionMinutes }} {{ __('minutes long.') }}
			</p>
			<p class="mt-1.5 flex items-center gap-1.5 text-p-sm text-ink-gray-5">
				<span class="lucide-globe size-4" />
				{{ __('Times shown in your timezone') }} ({{ browserTz }})
			</p>
		</div>

		<SkeletonLoader v-if="slots.loading" variant="list" :count="6" />
		<EmptyStateLayout
			v-else-if="!hasAnySlots"
			name="Slots"
			icon="lucide-calendar"
			:description="__('No slots available in the next few weeks. Please check back soon.')"
		/>

		<div v-else class="grid gap-5 md:grid-cols-[minmax(0,320px)_1fr]">
			<!-- Month calendar -->
			<div class="rounded-xl border border-outline-gray-2 bg-surface-white p-4">
				<div class="mb-3 flex items-center justify-between">
					<button
						class="rounded p-1.5 text-ink-gray-6 hover:bg-surface-gray-2 disabled:opacity-30"
						:disabled="isViewingCurrentMonth"
						@click="prevMonth"
					>
						<span class="lucide-chevron-left size-4" />
					</button>
					<span class="text-base-semibold text-ink-gray-8">
						{{ viewMonth.format('MMMM YYYY') }}
					</span>
					<button class="rounded p-1.5 text-ink-gray-6 hover:bg-surface-gray-2" @click="nextMonth">
						<span class="lucide-chevron-right size-4" />
					</button>
				</div>
				<div class="grid grid-cols-7 text-center text-xs text-ink-gray-5">
					<span v-for="d in weekdayLabels" :key="d" class="py-1">{{ d }}</span>
				</div>
				<div class="grid grid-cols-7 gap-1.5">
					<template v-for="(cell, i) in calendarDays" :key="i">
						<div v-if="!cell" />
						<button
							v-else
							class="flex aspect-square items-center justify-center rounded-lg text-sm transition-colors"
							:class="[
								cellClass(cell),
								cell.isToday && cell.key !== selectedDate ? 'ring-1 ring-inset ring-ink-gray-9' : '',
							]"
							:disabled="!cell.hasSlots"
							@click="pickDate(cell)"
						>
							{{ cell.day }}
						</button>
					</template>
				</div>
				<div class="mt-3 flex items-center gap-4 text-xs text-ink-gray-5">
					<span class="flex items-center gap-1.5">
						<span class="size-3 rounded bg-surface-gray-3" /> {{ __('Available') }}
					</span>
					<span class="flex items-center gap-1.5">
						<span class="size-3 rounded ring-1 ring-inset ring-outline-gray-2" />
						{{ __('Unavailable') }}
					</span>
				</div>
			</div>

			<!-- Time slots for the selected day -->
			<div class="rounded-xl border border-outline-gray-2 bg-surface-white p-5">
				<div v-if="selectedDate" class="mb-4 text-base-semibold text-ink-gray-8">
					{{ dayjs(selectedDate).format('dddd, DD MMMM') }}
				</div>
				<div v-if="daySlots.length" class="grid grid-cols-2 gap-2 sm:grid-cols-3">
					<Button
						v-for="slot in daySlots"
						:key="slot.slot_date + slot.slot_start_time"
						variant="outline"
						@click="selectSlot(slot)"
					>
						<template #prefix><span class="lucide-clock size-4 text-ink-gray-5" /></template>
						{{ slot.localLabel }}
					</Button>
				</div>
				<div v-else class="py-10 text-center text-p-sm text-ink-gray-5">
					{{ __('Select a highlighted day to see available times.') }}
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { createResource, Button, Breadcrumbs, usePageMeta } from 'frappe-ui'
import dayjs from '@/utils/dayjs'
import LayoutHeader from '@/components/Layouts/LayoutHeader.vue'
import EmptyStateLayout from '@/components/Layouts/EmptyStateLayout.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'

const router = useRouter()
const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
const weekdayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const viewMonth = ref(dayjs().startOf('month'))
const selectedDate = ref(null)

function toDateString(date) {
	return date.toISOString().slice(0, 10)
}

const today = new Date()
// Fetch a wide forward window so navigating to future months still reflects real availability
// (bookable range is capped server-side by max_advance_booking_days anyway).
const windowEnd = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)

const slots = createResource({
	url: 'celpipedu.api.booking.get_available_slots',
	params: { from_date: toDateString(today), to_date: toDateString(windowEnd) },
	auto: true,
})

// Convert every mentor-timezone slot into the visitor's local timezone and group by local day.
const slotsByLocalDate = computed(() => {
	const map = {}
	for (const s of Array.isArray(slots.data) ? slots.data : []) {
		const local = dayjs.tz(`${s.slot_date} ${s.slot_start_time}`, s.timezone || 'Asia/Kolkata').tz(browserTz)
		const key = local.format('YYYY-MM-DD')
		;(map[key] = map[key] || []).push({ ...s, localLabel: local.format('h:mm A'), _sort: local.valueOf() })
	}
	for (const k in map) map[k].sort((a, b) => a._sort - b._sort)
	return map
})

const hasAnySlots = computed(() => Object.keys(slotsByLocalDate.value).length > 0)
const sessionMinutes = computed(() => {
	const s = slots.data?.[0]
	if (!s?.slot_start_time || !s?.slot_end_time) return 60
	const [sh, sm] = s.slot_start_time.split(':').map(Number)
	const [eh, em] = s.slot_end_time.split(':').map(Number)
	return eh * 60 + em - (sh * 60 + sm)
})

// Jump to the first available day once slots load.
watch(slotsByLocalDate, (map) => {
	if (selectedDate.value) return
	const keys = Object.keys(map).sort()
	if (keys.length) {
		selectedDate.value = keys[0]
		viewMonth.value = dayjs(keys[0]).startOf('month')
	}
})

const todayKey = dayjs().format('YYYY-MM-DD')
const calendarDays = computed(() => {
	const start = viewMonth.value.startOf('month')
	const cells = []
	for (let i = 0; i < start.day(); i++) cells.push(null)
	for (let d = 1; d <= viewMonth.value.daysInMonth(); d++) {
		const date = start.date(d)
		const key = date.format('YYYY-MM-DD')
		cells.push({ day: d, key, hasSlots: !!slotsByLocalDate.value[key], isToday: key === todayKey })
	}
	return cells
})

const daySlots = computed(() => (selectedDate.value ? slotsByLocalDate.value[selectedDate.value] || [] : []))
const isViewingCurrentMonth = computed(() => viewMonth.value.isSame(dayjs(), 'month'))

function cellClass(cell) {
	if (cell.key === selectedDate.value) return 'bg-ink-gray-9 text-ink-white font-semibold'
	if (cell.hasSlots)
		return 'bg-surface-gray-2 text-ink-gray-9 font-medium hover:bg-surface-gray-4 cursor-pointer'
	return 'text-ink-gray-3 cursor-not-allowed'
}

function pickDate(cell) {
	if (cell.hasSlots) selectedDate.value = cell.key
}
function prevMonth() {
	viewMonth.value = viewMonth.value.subtract(1, 'month')
}
function nextMonth() {
	viewMonth.value = viewMonth.value.add(1, 'month')
}

function selectSlot(slot) {
	router.push({
		name: 'BookingDetailsForm',
		query: {
			slot_date: slot.slot_date,
			slot_start_time: slot.slot_start_time,
			slot_end_time: slot.slot_end_time,
			timezone: slot.timezone,
		},
	})
}

const breadcrumbs = computed(() => [{ label: __('Masterclass Sessions'), route: { name: 'SlotPicker' } }])
usePageMeta(() => ({ title: __('Book a Masterclass Session') }))
</script>
