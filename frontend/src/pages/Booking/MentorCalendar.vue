<template>
	<div class="flex flex-col h-full">
		<header
			class="sticky top-0 z-10 flex flex-col gap-2 border-b bg-surface-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
		>
			<div>
				<div class="text-lg font-semibold text-ink-gray-9">
					{{ __('Manage Availability') }}
				</div>
				<div class="text-sm text-ink-gray-6">
					{{ __('Drag on the calendar to open a slot. Click a block to remove it.') }}
					<span v-if="mentorTz"> · {{ __('Times shown in') }} {{ mentorTz }}</span>
				</div>
				<button
					class="mt-2 inline-flex items-center gap-1.5 text-p-sm-medium text-ink-gray-7 hover:text-ink-gray-9"
					@click="loadRecurring"
				>
					<span class="lucide-repeat-2 size-4" />
					{{ __('Recurring slots') }}
				</button>
			</div>
			<div class="flex flex-wrap items-center gap-3 text-xs text-ink-gray-7">
				<span class="flex items-center gap-1.5"><span class="size-3 rounded-sm" style="background:#10b981" /> {{ __('Weekly') }}</span>
				<span class="flex items-center gap-1.5"><span class="size-3 rounded-sm" style="background:#3b82f6" /> {{ __('One-off') }}</span>
				<span class="flex items-center gap-1.5"><span class="size-3 rounded-sm" style="background:#6366f1" /> {{ __('Booked') }}</span>
				<span class="flex items-center gap-1.5"><span class="size-3 rounded-sm" style="background:#64748b" /> {{ __('Busy (batch/other)') }}</span>
				<span class="flex items-center gap-1.5"><span class="size-3 rounded-sm" style="background:#fecaca" /> {{ __('Blackout') }}</span>
			</div>
		</header>

		<div
			v-if="busyError"
			class="flex items-center gap-2 border-b bg-surface-amber-1 px-4 py-2 text-p-sm text-ink-amber-7"
		>
			<span class="lucide-triangle-alert size-4 shrink-0" />
			<span>
				{{ __("Couldn't load your Google Calendar — batch classes and external commitments aren't shown here, and new bookings can't check conflicts. Reconnect the Google account to restore this.") }}
			</span>
		</div>

		<div class="flex-1 overflow-auto p-3">
			<FullCalendar ref="calendarRef" :options="calendarOptions" />
		</div>

		<!-- Create availability modal -->
		<Dialog
			v-model:open="showCreate"
			:title="__('Open availability')"
			:actions="[
				{
					label: __('Add availability'),
					variant: 'solid',
					disabled: !timeRangeValid,
					onClick: confirmCreate,
				},
			]"
		>
			<template #default>
				<div v-if="pending" class="space-y-4">
					<div class="grid grid-cols-2 gap-3">
						<FormControl v-model="pending.date" type="date" :label="__('Date')" />
						<div class="flex flex-col justify-end pb-2 text-p-sm text-ink-gray-6">
							{{ pendingDayLabel }}
						</div>
					</div>
					<div class="grid grid-cols-2 gap-3">
						<FormControl v-model="editStart" type="time" :label="__('Start time')" />
						<FormControl v-model="editEnd" type="time" :label="__('End time')" />
					</div>
					<p v-if="!timeRangeValid" class="text-xs text-ink-red-5">
						{{ __('Start time must be before end time.') }}
					</p>

					<div class="space-y-2">
						<div class="text-p-sm-medium text-ink-gray-7">{{ __('Repeat') }}</div>
						<div class="grid grid-cols-2 gap-2.5">
							<button
								v-for="opt in recurrenceOptions"
								:key="opt.value"
								type="button"
								class="rounded-lg border px-3 py-2.5 text-left transition-colors focus:outline-none"
								:class="
									recurrence === opt.value
										? 'border-ink-gray-9 ring-1 ring-ink-gray-9 bg-surface-gray-2'
										: 'border-outline-gray-2 hover:border-outline-gray-3'
								"
								@click="recurrence = opt.value"
							>
								<div
									class="text-p-sm-medium"
									:class="recurrence === opt.value ? 'text-ink-gray-9' : 'text-ink-gray-7'"
								>
									{{ opt.label }}
								</div>
								<div class="mt-0.5 text-xs text-ink-gray-5">{{ opt.hint }}</div>
							</button>
						</div>
					</div>

					<p class="text-xs text-ink-gray-5">
						{{ __('Bookable slots are generated in') }} {{ slotDuration }}
						{{ __('minute blocks within this window.') }}
					</p>
				</div>
			</template>
		</Dialog>

		<!-- Event detail modal -->
		<Dialog v-model:open="showEvent" :title="selected?.title" size="sm" :actions="eventActions">
			<template #default>
				<div class="text-sm text-ink-gray-6">{{ selected?.timeLabel }}</div>
				<div v-if="selected?.kind === 'booking'" class="mt-3 space-y-2">
					<div class="rounded-md bg-surface-gray-2 px-3 py-2 text-p-sm text-ink-gray-7">
						{{ __('Status') }}: {{ selected?.status }}
					</div>
					<div class="text-xs text-ink-gray-5">
						{{ __('Tip: drag the booking on the calendar to reschedule. Cancelling is final and issues no refund.') }}
					</div>
				</div>
				<div
					v-else-if="selected?.kind === 'busy'"
					class="mt-3 rounded-md bg-surface-amber-1 px-3 py-2 text-p-sm text-ink-amber-7"
				>
					{{ __('This time is taken by a batch class or another commitment on your calendar. It cannot accept 1:1 masterclass bookings.') }}
				</div>
				<div v-else-if="selected?.kind === 'blackout'" class="mt-3 text-p-sm text-ink-gray-6">
					{{ __('You blocked this time. Remove it to reopen the slots underneath.') }}
				</div>
				<div v-else class="mt-3 text-p-sm text-ink-gray-6">
					{{
						selected?.kind === 'weekly'
							? __('Recurring weekly availability — slots students can book.')
							: __('One-off availability for this day — slots students can book.')
					}}
				</div>
			</template>
		</Dialog>

		<!-- Recurring slots manager -->
		<Dialog v-model:open="showRecurring" :title="__('Recurring availability')">
			<template #default>
				<p class="mb-3 text-p-sm text-ink-gray-6">
					{{ __('These repeat every week until you cancel them here. Cancelling removes the slot from all its days at once.') }}
				</p>
				<div
					v-if="!recurringList.length"
					class="rounded-lg border border-dashed border-outline-gray-3 py-6 text-center text-p-sm text-ink-gray-5"
				>
					{{ __('No recurring slots yet.') }}
				</div>
				<div v-else class="divide-y divide-outline-gray-2">
					<div
						v-for="p in recurringList"
						:key="p.start_time + p.end_time"
						class="flex items-center justify-between gap-3 py-3"
					>
						<div class="min-w-0">
							<div class="text-p-sm-medium text-ink-gray-8">{{ p.label }}</div>
							<div class="text-xs text-ink-gray-5">
								{{ fmtTime(p.start_time) }} – {{ fmtTime(p.end_time) }}
							</div>
						</div>
						<Button
							variant="outline"
							theme="red"
							size="sm"
							:loading="saving"
							@click="cancelPattern(p)"
						>
							{{ __('Cancel all') }}
						</Button>
					</div>
				</div>
			</template>
		</Dialog>
	</div>
</template>

<script setup>
import { ref, reactive, computed, watch, inject } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { Dialog, Button, FormControl, call, toast } from 'frappe-ui'

const API = 'celpipedu.celpip_edu.doctype.celpip_mentor_availability.celpip_mentor_availability'
const dayjs = inject('$dayjs')

const calendarRef = ref(null)
const mentorTz = ref('')
const slotDuration = ref(60)
const saving = ref(false)
const busyError = ref(false)

const pending = ref(null)
const showCreate = ref(false)
const selected = ref(null)
const showEvent = ref(false)
const showRecurring = ref(false)
const recurringList = ref([])

const recurrence = ref('weekly')
const recurrenceOptions = computed(() => [
	{ value: 'one_time', label: __('One-time'), hint: __('This date only') },
	{ value: 'weekly', label: __('Every week'), hint: __('On this weekday') },
	{ value: 'weekdays', label: __('Weekdays'), hint: __('Mon to Fri') },
	{ value: 'daily', label: __('Every day'), hint: __('All 7 days') },
])

const pendingDayLabel = computed(() =>
	pending.value?.date ? dayjs(pending.value.date).format('dddd, DD MMM') : ''
)

// Native <input type="time"> works in "HH:mm"; the API (and the drag-select that seeds
// `pending`) uses "HH:mm:ss", so these bridge the two formats.
const editStart = computed({
	get: () => (pending.value?.start || '').slice(0, 5),
	set: (v) => {
		if (pending.value) pending.value.start = v ? `${v}:00` : ''
	},
})
const editEnd = computed({
	get: () => (pending.value?.end || '').slice(0, 5),
	set: (v) => {
		if (pending.value) pending.value.end = v ? `${v}:00` : ''
	},
})
const timeRangeValid = computed(
	() => !!pending.value?.start && !!pending.value?.end && pending.value.start < pending.value.end
)

function confirmCreate() {
	if (!timeRangeValid.value) return
	createAvailability(recurrence.value)
}

const eventActions = computed(() => {
	const s = selected.value
	if (!s) return []
	if (s.kind === 'booking') {
		return [
			{ label: __('Cancel session (no refund)'), variant: 'solid', theme: 'red', onClick: cancelBooking },
		]
	}
	// Busy blocks come from an external calendar (batches etc.) — informational only.
	if (s.kind === 'busy') return []
	// A recurring weekly slot that spans multiple days: offer single-day OR whole-pattern removal.
	if (s.kind === 'weekly' && s.patternDays > 1) {
		return [
			{ label: __('Remove this day'), variant: 'outline', onClick: removeAvailability },
			{
				label: `${__('Remove all')} ${s.patternDays} ${__('days')}`,
				variant: 'solid',
				theme: 'red',
				onClick: removeRecurringForSelected,
			},
		]
	}
	return [
		{
			label: s.kind === 'blackout' ? __('Remove blackout') : __('Remove slot'),
			variant: 'solid',
			theme: 'red',
			onClick: removeAvailability,
		},
	]
})

// Clear any leftover drag-selection when the create dialog closes.
watch(showCreate, (open) => {
	if (!open) calendarRef.value?.getApi().unselect()
})

function refetch() {
	calendarRef.value?.getApi().refetchEvents()
}

async function fetchEvents(info, success, failure) {
	try {
		const res = await call(API + '.get_calendar_events', {
			from_date: info.startStr.slice(0, 10),
			to_date: info.endStr.slice(0, 10),
		})
		mentorTz.value = res.timezone
		busyError.value = !!res.busy_error
		success(res.events)
	} catch (e) {
		failure(e)
	}
}

function onSelect(info) {
	const start = info.startStr.slice(11, 19) || '00:00:00'
	const end = info.endStr.slice(11, 19) || '00:00:00'
	pending.value = { date: info.startStr.slice(0, 10), start, end }
	recurrence.value = 'weekly'
	showCreate.value = true
}

function cancelCreate() {
	showCreate.value = false
	calendarRef.value?.getApi().unselect()
}

async function createAvailability(recurrence) {
	if (!pending.value) return
	saving.value = true
	try {
		const res = await call(API + '.add_availability', {
			date: pending.value.date,
			start_time: pending.value.start,
			end_time: pending.value.end,
			recurrence,
		})
		showCreate.value = false
		refetch()
		toast.success(res?.added ? __('Availability added') : __('Already open for that time'))
	} catch (e) {
		toast.error(e.messages?.[0] || __('Could not add availability'))
	} finally {
		saving.value = false
	}
}

function onEventClick(info) {
	const p = info.event.extendedProps
	selected.value = {
		title: info.event.title,
		kind: p.kind,
		rowName: p.rowName,
		bookingName: p.bookingName,
		status: p.status,
		startTime: p.startTime,
		endTime: p.endTime,
		patternDays: p.patternDays || 1,
		timeLabel:
			dayjs(info.event.start).format('ddd, DD MMM · hh:mm A') +
			' – ' +
			dayjs(info.event.end).format('hh:mm A'),
	}
	showEvent.value = true
}

async function removeAvailability() {
	if (!selected.value) return
	saving.value = true
	try {
		await call(API + '.remove_availability', {
			kind: selected.value.kind,
			row_name: selected.value.rowName,
		})
		showEvent.value = false
		refetch()
		toast.success(__('Removed'))
	} catch (e) {
		toast.error(e.messages?.[0] || __('Could not remove'))
	} finally {
		saving.value = false
	}
}

async function removeRecurringForSelected() {
	if (!selected.value?.startTime) return
	saving.value = true
	try {
		const res = await call(API + '.remove_recurring_pattern', {
			start_time: selected.value.startTime,
			end_time: selected.value.endTime,
		})
		showEvent.value = false
		refetch()
		toast.success(`${__('Removed from')} ${res.removed} ${__('days')}`)
	} catch (e) {
		toast.error(e.messages?.[0] || __('Could not remove'))
	} finally {
		saving.value = false
	}
}

async function loadRecurring() {
	recurringList.value = (await call(API + '.list_recurring_availability')) || []
	showRecurring.value = true
}

async function cancelPattern(pattern) {
	saving.value = true
	try {
		await call(API + '.remove_recurring_pattern', {
			start_time: pattern.start_time,
			end_time: pattern.end_time,
		})
		recurringList.value = (await call(API + '.list_recurring_availability')) || []
		refetch()
		toast.success(__('Recurring slot cancelled'))
	} catch (e) {
		toast.error(e.messages?.[0] || __('Could not cancel'))
	} finally {
		saving.value = false
	}
}

function fmtTime(t) {
	if (!t) return ''
	const [h, m] = t.split(':')
	return dayjs().hour(Number(h)).minute(Number(m)).format('h:mm A')
}

async function cancelBooking() {
	if (!selected.value?.bookingName) return
	const reason = window.prompt(
		__('Reason for cancellation (optional). This is final and issues no refund.')
	)
	if (reason === null) return // user dismissed the prompt
	saving.value = true
	try {
		await call(API + '.admin_cancel_booking', {
			booking_name: selected.value.bookingName,
			reason,
		})
		showEvent.value = false
		refetch()
		toast.success(__('Session cancelled'))
	} catch (e) {
		toast.error(e.messages?.[0] || __('Could not cancel'))
	} finally {
		saving.value = false
	}
}

async function onEventDrop(info) {
	const p = info.event.extendedProps
	if (p.kind !== 'booking') {
		info.revert()
		return
	}
	const start = info.event.start
	const end = info.event.end
	if (!window.confirm(__('Reschedule this session to') + ' ' + dayjs(start).format('ddd DD MMM · hh:mm A') + '?')) {
		info.revert()
		return
	}
	try {
		await call(API + '.admin_reschedule_booking', {
			booking_name: p.bookingName,
			new_date: dayjs(start).format('YYYY-MM-DD'),
			new_start_time: dayjs(start).format('HH:mm:ss'),
			new_end_time: dayjs(end).format('HH:mm:ss'),
		})
		toast.success(__('Session rescheduled'))
		refetch()
	} catch (e) {
		info.revert()
		toast.error(e.messages?.[0] || __('Could not reschedule'))
	}
}

const calendarOptions = reactive({
	plugins: [timeGridPlugin, dayGridPlugin, interactionPlugin],
	initialView: 'timeGridWeek',
	timeZone: 'local',
	headerToolbar: {
		left: 'prev,next today',
		center: 'title',
		right: 'timeGridWeek,timeGridDay,dayGridMonth',
	},
	nowIndicator: true,
	allDaySlot: false,
	selectable: true,
	selectMirror: true,
	editable: true,
	eventDurationEditable: false,
	eventStartEditable: true,
	slotDuration: '00:30:00',
	scrollTime: '07:00:00',
	height: 'auto',
	expandRows: true,
	events: fetchEvents,
	select: onSelect,
	eventClick: onEventClick,
	eventDrop: onEventDrop,
})
</script>
