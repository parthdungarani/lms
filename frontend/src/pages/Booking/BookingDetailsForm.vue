<template>
	<header
		class="sticky top-0 z-10 flex items-center justify-between border-b bg-surface-base px-3 py-2.5 sm:px-5"
	>
		<Breadcrumbs :items="breadcrumbs" />
	</header>
	<div class="mx-auto max-w-md px-5 pb-10 pt-8">
		<div class="mb-5 text-xl-semibold text-ink-gray-9">
			{{ __('Confirm your session') }}
		</div>

		<div class="space-y-3 rounded-md bg-surface-gray-2 p-5">
			<div class="text-xs uppercase text-ink-gray-5">
				{{ __('Date & Time') }}
			</div>
			<div class="flex items-center gap-x-2 text-ink-gray-9">
				<span class="lucide-calendar size-4 text-ink-gray-6" />
				{{ route.query.slot_date }}
				<span class="lucide-clock size-4 text-ink-gray-6" />
				{{ String(route.query.slot_start_time).slice(0, 5) }}
			</div>
		</div>

		<Button
			class="mt-6 w-full"
			variant="solid"
			size="lg"
			:loading="creating"
			@click="confirmAndPay"
		>
			{{ __('Confirm & Pay') }}
		</Button>
	</div>
</template>
<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { call, toast, Button, Breadcrumbs } from 'frappe-ui'

const route = useRoute()
const router = useRouter()
const creating = ref(false)

const breadcrumbs = [
	{ label: __('1:1 Sessions'), route: { name: 'SlotPicker' } },
	{ label: __('Confirm'), route: { name: 'BookingDetailsForm' } },
]

async function confirmAndPay() {
	creating.value = true
	try {
		const bookingName = await call(
			'celpipedu.api.booking.create_draft_booking',
			{
				slot_date: route.query.slot_date,
				slot_start_time: route.query.slot_start_time,
				slot_end_time: route.query.slot_end_time,
			}
		)
		router.push({ name: 'BookingCheckout', params: { name: bookingName } })
	} catch (error) {
		toast({
			title: __('Could not create booking'),
			text: error.messages?.[0] || error.message,
			icon: 'x',
			iconClasses: 'text-red-500',
		})
	} finally {
		creating.value = false
	}
}
</script>
