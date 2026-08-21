<template>
	<header
		class="sticky top-0 z-10 flex items-center justify-between border-b bg-surface-base px-3 py-2.5 sm:px-5"
	>
		<Breadcrumbs :items="breadcrumbs" />
	</header>

	<div class="mx-auto max-w-xl px-4 py-8 sm:py-10">
		<h1 class="mb-1 text-xl-semibold text-ink-gray-9">
			{{ __('Secure checkout') }}
		</h1>
		<p class="mb-6 text-p-sm text-ink-gray-6">
			{{ __('Review your session and complete payment to confirm your booking.') }}
		</p>

		<div v-if="!summary.data" class="space-y-4">
			<div class="h-36 animate-pulse rounded-xl bg-surface-gray-2" />
			<div class="h-12 animate-pulse rounded-lg bg-surface-gray-2" />
		</div>

		<template v-else>
			<div
				class="overflow-hidden rounded-xl border border-outline-gray-2 bg-surface-base shadow-sm"
			>
				<div class="border-b border-outline-gray-2 p-5">
					<div class="text-xs uppercase tracking-wide text-ink-gray-5">
						{{ __('Masterclass Session') }}
					</div>
					<div class="mt-1 text-lg-semibold text-ink-gray-9">
						{{ summary.data.display_title }}
					</div>
					<div
						v-if="summary.data.timezone"
						class="mt-1.5 flex items-center gap-1.5 text-p-sm text-ink-gray-5"
					>
						<span class="lucide-globe size-4" />
						{{ summary.data.timezone }}
					</div>
				</div>
				<div class="flex items-center justify-between bg-surface-gray-1 p-5">
					<span class="text-p-base text-ink-gray-7">{{ __('Total payable') }}</span>
					<span class="text-2xl-semibold text-ink-gray-9">{{ formattedAmount }}</span>
				</div>
			</div>

			<Button
				class="mt-5 w-full"
				variant="solid"
				size="lg"
				:loading="payingNow"
				@click="payNow"
			>
				<template #prefix>
					<span class="lucide-lock size-4" />
				</template>
				{{ payLabel }}
			</Button>

			<div class="mt-5 space-y-2 text-center">
				<div
					class="flex items-center justify-center gap-2 text-p-sm text-ink-gray-6"
				>
					<span class="lucide-shield-check size-4 text-ink-green-600" />
					{{ __('256-bit SSL secured · Payments processed by Razorpay') }}
				</div>
				<div class="text-xs text-ink-gray-5">
					{{ __('Cards · UPI · Net Banking · Wallets accepted') }}
				</div>
				<div
					class="flex items-center justify-center gap-2 text-xs text-ink-gray-5"
				>
					<span class="lucide-badge-check size-3.5" />
					{{ __('Your meeting link is created instantly after payment') }}
				</div>
			</div>
		</template>
	</div>
</template>
<script setup>
import { ref, computed } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { call, createResource, toast, Button, Breadcrumbs } from 'frappe-ui'
import { formatNumberIntoCurrency } from '@/utils'

const REFERENCE_DOCTYPE = 'CELPIP Slot Booking'

const props = defineProps({
	name: { type: String, required: true },
})

const router = useRouter()
const payingNow = ref(false)

const breadcrumbs = [
	{ label: __('Masterclass Sessions'), route: { name: 'SlotPicker' } },
	{
		label: __('Checkout'),
		route: { name: 'BookingCheckout', params: { name: props.name } },
	},
]

const summary = createResource({
	url: 'celpipedu.api.checkout.get_order_summary',
	params: { reference_doctype: REFERENCE_DOCTYPE, reference_name: props.name },
	auto: true,
})

// Leaving checkout for anywhere other than the payment-processing screen means the user
// didn't complete payment (e.g. they hit back) -- release the held slot immediately so it
// doesn't stay blocked for the hold window. No-op server-side once the booking is paid.
onBeforeRouteLeave((to) => {
	if (to.name !== 'BookingPaymentProcessing') {
		call('celpipedu.api.booking.release_slot_hold', { booking_name: props.name })
	}
	return true
})

const formattedAmount = computed(() => {
	if (!summary.data) return ''
	return formatNumberIntoCurrency(summary.data.amount, summary.data.currency)
})

const payLabel = computed(() => `${__('Pay')} ${formattedAmount.value} ${__('securely')}`)

function loadRazorpayScript() {
	if (window.Razorpay) return Promise.resolve()
	return new Promise((resolve, reject) => {
		const script = document.createElement('script')
		script.src = 'https://checkout.razorpay.com/v1/checkout.js'
		script.onload = resolve
		script.onerror = reject
		document.body.appendChild(script)
	})
}

async function payNow() {
	payingNow.value = true
	try {
		await loadRazorpayScript()
		const order = await call('celpipedu.api.checkout.create_order', {
			reference_doctype: REFERENCE_DOCTYPE,
			reference_name: props.name,
		})

		const razorpay = new window.Razorpay({
			key: order.razorpay_key_id,
			order_id: order.order_id,
			amount: order.amount,
			currency: order.currency,
			name: 'CELPIP Edu',
			description: summary.data?.display_title,
			// This success callback is client-side only and is never treated as proof of
			// payment -- the webhook confirmation on the backend is the source of truth.
			// We just move the user to a "confirming..." screen here.
			handler() {
				router.push({
					name: 'BookingPaymentProcessing',
					params: { name: props.name },
				})
			},
			modal: {
				ondismiss() {
					payingNow.value = false
					// Free the slot at once when the payment window is closed without paying,
					// instead of holding it until the backstop hold window lapses.
					call('celpipedu.api.booking.release_slot_hold', {
						booking_name: props.name,
					})
				},
			},
		})
		razorpay.open()
	} catch (error) {
		const message = error.messages?.[0] || error.message || ''
		toast({
			title: __('Could not start checkout'),
			text: message,
			icon: 'x',
			iconClasses: 'text-red-500',
		})
		payingNow.value = false
		// If the slot was taken while they were on this page, send them back to re-pick.
		if (REFERENCE_DOCTYPE === 'CELPIP Slot Booking' && /slot|booked|available/i.test(message)) {
			router.push({ name: 'SlotPicker' })
		}
	}
}
</script>
