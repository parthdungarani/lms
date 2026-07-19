<template>
	<header
		class="sticky top-0 z-10 flex items-center justify-between border-b bg-surface-base px-3 py-2.5 sm:px-5"
	>
		<Breadcrumbs :items="breadcrumbs" />
	</header>
	<div class="mx-auto max-w-md px-5 pb-10 pt-8">
		<div class="mb-5 text-xl-semibold text-ink-gray-9">
			{{ __('Checkout') }}
		</div>

		<div v-if="summary.data" class="space-y-1 rounded-md bg-surface-gray-2 p-5">
			<div class="text-xs uppercase text-ink-gray-5">
				{{ summary.data.display_title }}
			</div>
			<div
				class="border-t border-outline-gray-3 pt-4 text-4xl-semibold text-ink-gray-9"
			>
				{{ summary.data.currency }} {{ summary.data.amount }}
			</div>
		</div>

		<Button
			class="mt-6 w-full"
			variant="solid"
			size="lg"
			:loading="payingNow"
			@click="payNow"
		>
			{{ __('Pay Now') }}
		</Button>
	</div>
</template>
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { call, createResource, toast, Button, Breadcrumbs } from 'frappe-ui'

const REFERENCE_DOCTYPE = 'CELPIP Slot Booking'

const props = defineProps({
	name: { type: String, required: true },
})

const router = useRouter()
const payingNow = ref(false)

const breadcrumbs = [
	{ label: __('1:1 Sessions'), route: { name: 'SlotPicker' } },
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
				},
			},
		})
		razorpay.open()
	} catch (error) {
		toast({
			title: __('Could not start checkout'),
			text: error.messages?.[0] || error.message,
			icon: 'x',
			iconClasses: 'text-red-500',
		})
		payingNow.value = false
	}
}
</script>
