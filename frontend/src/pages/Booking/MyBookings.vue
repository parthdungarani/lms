<template>
	<LayoutHeader>
		<template #left-header>
			<Breadcrumbs :items="breadcrumbs" />
		</template>
	</LayoutHeader>
	<div class="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:py-10">
		<h1 class="mb-6 text-xl-semibold text-ink-gray-9">
			{{ __('My Bookings') }}
		</h1>

		<SkeletonLoader v-if="bookings.loading" variant="list" :count="5" />
		<div v-else-if="!bookings.data?.length" class="flex-1">
			<EmptyStateLayout
				name="Bookings"
				icon="lucide-calendar-check"
				:description="__('You have not booked any Masterclass sessions yet.')"
			/>
		</div>
		<template v-else>
			<div class="space-y-3">
				<div
					v-for="booking in bookings.data"
					:key="booking.name"
					class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-gray-2 bg-surface-base p-4 shadow-sm"
				>
					<div class="min-w-0">
						<div class="flex items-center gap-2 text-base-semibold text-ink-gray-9">
							<span class="lucide-calendar size-4 text-ink-gray-5" />
							{{ formatDate(booking.slot_date) }}
						</div>
						<div
							class="mt-1 flex items-center gap-2 text-p-sm text-ink-gray-6"
						>
							<span class="lucide-clock size-4 text-ink-gray-5" />
							{{ booking.slot_start_time.slice(0, 5) }}
							<span v-if="booking.timezone" class="text-ink-gray-5">
								· {{ booking.timezone }}</span
							>
							<span v-if="booking.module" class="text-ink-gray-5">
								· {{ booking.module }}</span
							>
						</div>
					</div>
					<div class="flex items-center gap-3">
						<StatusBadge :status="booking.status" />
						<router-link
							v-if="booking.status === 'Confirmed'"
							:to="{ name: 'BookingJoin', params: { bookingId: booking.name } }"
						>
							<Button variant="solid">
								<template #prefix>
									<span class="lucide-video size-4" />
								</template>
								{{ __('Join') }}
							</Button>
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

function formatDate(d) {
	const [y, m, day] = String(d).split('-').map(Number)
	return new Date(y, m - 1, day).toLocaleDateString(undefined, {
		weekday: 'long',
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	})
}

// CELPIP Slot Booking grants doctype-level "read" to role "All" (any logged-in user can
// create/view their own bookings) but has no permission_query_conditions hook, so an
// unfiltered list call would return every student's bookings, not just the caller's --
// this explicit filter is required, not an optimization. sessionStore().user reads the
// user_id cookie synchronously, so it's available before userResource's async fetch resolves.
const session = sessionStore()

const bookings = createListResource({
	doctype: 'CELPIP Slot Booking',
	fields: ['name', 'slot_date', 'slot_start_time', 'timezone', 'status', 'module'],
	filters: { student: session.user },
	orderBy: 'slot_date desc',
	pageLength: 20,
	auto: true,
})

usePageMeta(() => ({ title: __('My Bookings') }))
</script>
