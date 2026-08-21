<template>
	<header
		class="sticky top-0 z-10 flex items-center justify-between border-b bg-surface-base px-3 py-2.5 sm:px-5"
	>
		<Breadcrumbs :items="breadcrumbs" />
	</header>
	<div class="mx-auto max-w-md px-4 py-10">
		<div
			v-if="joinInfo.data"
			class="rounded-xl border border-outline-gray-2 bg-surface-base p-6 text-center shadow-sm"
		>
			<span
				class="lucide-video mx-auto mb-3 block size-9 text-ink-gray-6"
			/>
			<div class="text-xl-semibold text-ink-gray-9">
				{{ __('Your Masterclass Session') }}
			</div>
			<div
				class="mt-3 flex items-center justify-center gap-2 text-p-sm text-ink-gray-7"
			>
				<span class="lucide-calendar size-4 text-ink-gray-5" />
				{{ formattedDate }}
				<span class="lucide-clock ms-2 size-4 text-ink-gray-5" />
				{{ joinInfo.data.slot_start_time.slice(0, 5) }}
				<span v-if="joinInfo.data.timezone" class="text-ink-gray-5">
					· {{ joinInfo.data.timezone }}</span
				>
			</div>
			<div v-if="joinInfo.data.module" class="mt-2 text-p-sm text-ink-gray-6">
				{{ __('Focus') }}:
				<span class="text-ink-gray-8">{{ joinInfo.data.module }}</span>
				<span v-if="joinInfo.data.current_score">
					· {{ __('Current score') }}: {{ joinInfo.data.current_score }}</span
				>
			</div>

			<a
				v-if="joinInfo.data.join_url"
				:href="joinInfo.data.join_url"
				target="_blank"
				rel="noopener"
			>
				<Button variant="solid" size="lg" class="mt-6">
					<template #prefix>
						<span class="lucide-video size-4" />
					</template>
					{{ joinInfo.data.label || __('Join session') }}
				</Button>
			</a>
			<p v-else class="mt-6 text-p-sm text-ink-gray-6">
				{{
					__(
						"Your join link isn't ready yet. Please refresh in a moment — we'll also email it to you."
					)
				}}
			</p>

			<p class="mt-4 text-xs text-ink-gray-5">
				{{ __('A calendar invite with this link has been sent to your email.') }}
			</p>
		</div>
	</div>
</template>
<script setup>
import { computed } from 'vue'
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

const formattedDate = computed(() => {
	const d = String(joinInfo.data?.slot_date || '')
	if (!d) return ''
	const [y, m, day] = d.split('-').map(Number)
	return new Date(y, m - 1, day).toLocaleDateString(undefined, {
		weekday: 'long',
		day: 'numeric',
		month: 'short',
	})
})
</script>
