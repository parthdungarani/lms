<template>
	<header
		class="sticky top-0 z-10 flex items-center justify-between border-b bg-surface-base px-3 py-2.5 sm:px-5"
	>
		<Breadcrumbs :items="breadcrumbs" />
	</header>
	<div class="mx-auto max-w-md px-5 py-16 text-center">
		<div class="text-base-semibold text-ink-gray-9">
			{{
				slow
					? __('Still confirming your payment...')
					: __('Confirming your payment...')
			}}
		</div>
		<p class="mt-2 text-p-sm text-ink-gray-6">
			{{
				__(
					"You can safely close this page — your enrollment is completed automatically and we'll email you as soon as it's confirmed."
				)
			}}
		</p>
		<p v-if="slow" class="mt-3 text-p-sm text-ink-gray-5">
			{{
				__(
					"This is taking a little longer than usual, but your payment is safe. We'll notify you by email once it's done — no need to pay again."
				)
			}}
		</p>
	</div>
</template>
<script setup>
import { inject, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { call, Breadcrumbs } from 'frappe-ui'

const REFERENCE_DOCTYPE = 'LMS Batch'

const props = defineProps({
	name: { type: String, required: true },
})

const router = useRouter()
const socket = inject('$socket')

// Flips true if confirmation hasn't arrived within a few seconds, so we can switch from
// "confirming..." to a reassuring "still working, we'll email you" message. The webhook is
// the source of truth and finishes server-side even if the user leaves this page.
const slow = ref(false)

const breadcrumbs = [
	{ label: __('Batches'), route: { name: 'Batches' } },
	{
		label: __('Confirming Payment'),
		route: { name: 'BatchPaymentProcessing', params: { name: props.name } },
	},
]

let pollTimer = null
let slowTimer = null
let settled = false

function goToResult(status) {
	if (settled) return
	settled = true
	router.replace({
		name: 'BatchPaymentResult',
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
	slowTimer = setTimeout(() => {
		slow.value = true
	}, 8000)
})

onUnmounted(() => {
	socket?.off('celpipedu:payment_update', onRealtimeUpdate)
	if (pollTimer) clearTimeout(pollTimer)
	if (slowTimer) clearTimeout(slowTimer)
})
</script>
