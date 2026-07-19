<template>
	<LayoutHeader>
		<template #left-header>
			<Breadcrumbs :items="breadcrumbs" />
		</template>
	</LayoutHeader>
	<div class="flex min-h-0 flex-1 flex-col p-5 pb-10">
		<div class="mb-5 text-xl-semibold text-ink-gray-9">
			{{ __('My Bookings') }}
		</div>

		<SkeletonLoader v-if="bookings.loading" variant="list" :count="5" />
		<div v-else-if="!bookings.data?.length" class="flex-1">
			<EmptyStateLayout
				name="Bookings"
				icon="lucide-calendar-check"
				:description="__('You have not booked any 1:1 sessions yet.')"
			/>
		</div>
		<template v-else>
			<div class="divide-y rounded-md border">
				<div
					v-for="booking in bookings.data"
					:key="booking.name"
					class="flex items-center justify-between p-4"
				>
					<div class="flex items-center gap-x-2 text-sm text-ink-gray-8">
						<span class="lucide-calendar size-4 text-ink-gray-6" />
						{{ booking.slot_date }}
						<span class="lucide-clock ms-2 size-4 text-ink-gray-6" />
						{{ booking.slot_start_time.slice(0, 5) }}
					</div>
					<div class="flex items-center gap-3">
						<StatusBadge :status="booking.status" />
						<router-link
							v-if="booking.status === 'Confirmed'"
							:to="{ name: 'BookingJoin', params: { bookingId: booking.name } }"
						>
							<Button variant="outline">{{ __('Join') }}</Button>
						</router-link>
						<router-link
							v-else-if="booking.status === 'Pending Payment'"
							:to="{ name: 'BookingCheckout', params: { name: booking.name } }"
						>
							<Button variant="outline">{{ __('Complete Payment') }}</Button>
						</router-link>
					</div>
				</div>
			</div>
			<div v-if="bookings.hasNextPage" class="mt-5 flex justify-center">
				<Button @click="bookings.next()">{{ __('Load More') }}</Button>
			</div>
		</template>
	</div>
</template>
<script setup>
import { computed } from 'vue'
import { createListResource, Button, Breadcrumbs, usePageMeta } from 'frappe-ui'
import LayoutHeader from '@/components/Layouts/LayoutHeader.vue'
import EmptyStateLayout from '@/components/Layouts/EmptyStateLayout.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'
import StatusBadge from '@/components/Booking/StatusBadge.vue'
import { sessionStore } from '@/stores/session'

const breadcrumbs = computed(() => [
	{ label: __('My Bookings'), route: { name: 'MyBookings' } },
])

// CELPIP Slot Booking grants doctype-level "read" to role "All" (any logged-in user can
// create/view their own bookings) but has no permission_query_conditions hook, so an
// unfiltered list call would return every student's bookings, not just the caller's --
// this explicit filter is required, not an optimization. sessionStore().user reads the
// user_id cookie synchronously, so it's available before userResource's async fetch resolves.
const session = sessionStore()

const bookings = createListResource({
	doctype: 'CELPIP Slot Booking',
	fields: ['name', 'slot_date', 'slot_start_time', 'status'],
	filters: { student: session.user },
	orderBy: 'slot_date desc',
	pageLength: 20,
	auto: true,
})

usePageMeta(() => ({ title: __('My Bookings') }))
</script>
