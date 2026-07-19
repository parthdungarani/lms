<template>
	<header
		class="sticky top-0 z-10 flex items-center justify-between border-b bg-surface-base px-3 py-2.5 sm:px-5"
	>
		<Breadcrumbs :items="breadcrumbs" />
	</header>
	<div class="mx-auto max-w-md px-5 py-16 text-center">
		<template v-if="joinInfo.data">
			<span class="lucide-video mx-auto mb-3 block size-8 text-ink-gray-6" />
			<div class="text-xl-semibold text-ink-gray-9">
				{{ __('Your 1:1 Session') }}
			</div>
			<p
				class="mt-2 flex items-center justify-center gap-x-2 text-p-sm text-ink-gray-6"
			>
				<span class="lucide-calendar size-4" />
				{{ joinInfo.data.slot_date }}
				<span class="lucide-clock size-4" />
				{{ joinInfo.data.slot_start_time.slice(0, 5) }}
			</p>
			<a :href="joinInfo.data.zoom_join_url" target="_blank" rel="noopener">
				<Button variant="solid" size="lg" class="mt-6">{{
					__('Join on Zoom')
				}}</Button>
			</a>
		</template>
	</div>
</template>
<script setup>
import { createResource, Button, Breadcrumbs } from 'frappe-ui'

const props = defineProps({
	bookingId: { type: String, required: true },
})

const breadcrumbs = [
	{ label: __('My Bookings'), route: { name: 'MyBookings' } },
	{
		label: __('Join Session'),
		route: { name: 'BookingJoin', params: { bookingId: props.bookingId } },
	},
]

const joinInfo = createResource({
	url: 'celpipedu.api.live.get_booking_join_info',
	params: { booking_name: props.bookingId },
	auto: true,
})
</script>
