<template>
	<header
		class="sticky top-0 z-10 flex items-center justify-between border-b bg-surface-base px-3 py-2.5 sm:px-5"
	>
		<Breadcrumbs :items="breadcrumbs" />
	</header>
	<div class="mx-auto max-w-md px-5 py-16 text-center">
		<div class="text-base-semibold text-ink-gray-9">
			{{ __('Confirming your payment...') }}
		</div>
		<p class="mt-2 text-p-sm text-ink-gray-6">
			{{ __("This usually takes a few seconds. Don't close this tab.") }}
		</p>
	</div>
</template>
<script setup>
import { inject, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { call, Breadcrumbs } from 'frappe-ui'

const REFERENCE_DOCTYPE = 'CELPIP Slot Booking'

const props = defineProps({
	name: { type: String, required: true },
})

const router = useRouter()
const socket = inject('$socket')

const breadcrumbs = [
	{ label: __('1:1 Sessions'), route: { name: 'SlotPicker' } },
	{
		label: __('Confirming Payment'),
		route: { name: 'BookingPaymentProcessing', params: { name: props.name } },
	},
]

let pollTimer = null
let settled = false

function goToResult(status) {
	if (settled) return
	settled = true
	router.replace({
		name: 'BookingPaymentResult',
		params: { name: props.name },
		query: { status },
	})
}

function onRealtimeUpdate(payload) {
	if (
		payload.reference_doctype === REFERENCE_DOCTYPE &&
		payload.reference_name === props.name
	) {
		goToResult(payload.status === 'Confirmed' ? 'success' : 'failed')
	}
}

async function poll(delayMs) {
	if (settled) return
	const result = await call('celpipedu.api.checkout.get_payment_status', {
		reference_doctype: REFERENCE_DOCTYPE,
		reference_name: props.name,
	})
	if (result.status === 'Confirmed') {
		goToResult('success')
		return
	}
	if (result.status === 'Failed' || result.status === 'Payment Failed') {
		goToResult('failed')
		return
	}
	// Poll every 3s for the first 30s, then back off to every 10s -- realtime
	// normally wins first, this is only the fallback for a dropped/slow socket.
	pollTimer = setTimeout(() => poll(Math.min(delayMs + 1000, 10000)), delayMs)
}

onMounted(() => {
	socket?.on('celpipedu:payment_update', onRealtimeUpdate)
	poll(3000)
})

onUnmounted(() => {
	socket?.off('celpipedu:payment_update', onRealtimeUpdate)
	if (pollTimer) clearTimeout(pollTimer)
})
</script>
