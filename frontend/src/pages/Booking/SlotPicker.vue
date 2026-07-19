<template>
	<LayoutHeader>
		<template #left-header>
			<Breadcrumbs :items="breadcrumbs" />
		</template>
	</LayoutHeader>
	<div class="flex min-h-0 flex-1 flex-col p-5 pb-10">
		<div class="mb-5">
			<div class="text-xl-semibold text-ink-gray-9">
				{{ __('Book a 1:1 Session') }}
			</div>
			<div class="mt-1 text-p-base text-ink-gray-6">
				{{
					__('Pick a time that works for you. Sessions are {0} minutes.', [
						slots.data?.duration || 30,
					])
				}}
			</div>
		</div>

		<SkeletonLoader v-if="slots.loading" variant="list" :count="6" />
		<div v-else-if="!groupedSlots.length" class="flex-1">
			<EmptyStateLayout
				name="Slots"
				icon="lucide-calendar"
				:description="
					__('No slots available in the next few weeks. Check back soon.')
				"
			/>
		</div>
		<div v-else class="space-y-4">
			<div
				v-for="group in groupedSlots"
				:key="group.date"
				class="rounded-md border p-4"
			>
				<div
					class="mb-3 flex items-center gap-x-2 text-base-semibold text-ink-gray-8"
				>
					<span class="lucide-calendar size-4 text-ink-gray-6" />
					{{ group.date }}
				</div>
				<div class="flex flex-wrap gap-2">
					<Button
						v-for="slot in group.slots"
						:key="slot.slot_start_time"
						variant="outline"
						@click="selectSlot(slot)"
					>
						<template #prefix>
							<span class="lucide-clock size-4" />
						</template>
						{{ slot.slot_start_time.slice(0, 5) }}
					</Button>
				</div>
			</div>
		</div>
	</div>
</template>
<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { createResource, Button, Breadcrumbs, usePageMeta } from 'frappe-ui'
import LayoutHeader from '@/components/Layouts/LayoutHeader.vue'
import EmptyStateLayout from '@/components/Layouts/EmptyStateLayout.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'

const router = useRouter()

function toDateString(date) {
	return date.toISOString().slice(0, 10)
}

const today = new Date()
const fourWeeksOut = new Date(today.getTime() + 28 * 24 * 60 * 60 * 1000)

const slots = createResource({
	url: 'celpipedu.api.booking.get_available_slots',
	params: {
		from_date: toDateString(today),
		to_date: toDateString(fourWeeksOut),
	},
	auto: true,
})

const groupedSlots = computed(() => {
	if (!Array.isArray(slots.data)) return []
	const byDate = {}
	for (const slot of slots.data) {
		byDate[slot.slot_date] = byDate[slot.slot_date] || []
		byDate[slot.slot_date].push(slot)
	}
	return Object.keys(byDate)
		.sort()
		.map((date) => ({ date, slots: byDate[date] }))
})

function selectSlot(slot) {
	router.push({
		name: 'BookingDetailsForm',
		query: {
			slot_date: slot.slot_date,
			slot_start_time: slot.slot_start_time,
			slot_end_time: slot.slot_end_time,
		},
	})
}

const breadcrumbs = computed(() => [
	{ label: __('1:1 Sessions'), route: { name: 'SlotPicker' } },
])

usePageMeta(() => ({ title: __('Book a 1:1 Session') }))
</script>
