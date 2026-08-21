<template>
	<LayoutHeader>
		<template #left-header>
			<Breadcrumbs
				:items="[
					{ label: __('Material Hub'), route: { name: 'MaterialHub' } },
					{ label: __('Checkout'), route: { name: 'MaterialCheckout', params: { name } } },
				]"
			/>
		</template>
	</LayoutHeader>

	<div class="mx-auto w-full max-w-lg flex-1 px-4 py-8 sm:py-10">
		<div
			v-if="confirming"
			class="flex flex-col items-center gap-3 rounded-xl border border-outline-gray-2 bg-surface-white p-8 text-center"
		>
			<span class="lucide-loader-circle size-8 animate-spin text-ink-gray-6" />
			<div class="text-base-semibold text-ink-gray-9">{{ __('Confirming your payment') }}</div>
			<p class="text-p-sm text-ink-gray-6">
				{{ __('This can take a few seconds. Please don’t close this window.') }}
			</p>
		</div>

		<template v-else-if="summary.data">
			<h1 class="text-xl-semibold text-ink-gray-9">{{ __('Checkout') }}</h1>
			<p class="mt-1 text-p-base text-ink-gray-6">{{ __('Review your order and pay securely.') }}</p>

			<!-- Order summary -->
			<div class="mt-5 overflow-hidden rounded-xl border border-outline-gray-2 bg-surface-white">
				<div class="border-b border-outline-gray-2 px-5 py-4">
					<div class="text-base-semibold text-ink-gray-9">{{ summary.data.display_title }}</div>
					<div class="mt-0.5 text-p-sm text-ink-gray-5">
						{{ summary.data.file_count }} {{ __('PDF resources · one-time purchase') }}
					</div>
				</div>

				<div v-if="summary.data.files?.length" class="px-5 py-3">
					<div class="mb-2 text-xs font-medium uppercase tracking-wide text-ink-gray-5">
						{{ __("What's included") }}
					</div>
					<div
						v-for="(file, i) in summary.data.files"
						:key="i"
						class="flex items-center gap-2 py-1.5 text-p-sm text-ink-gray-7"
					>
						<span class="lucide-file-text size-4 shrink-0 text-ink-gray-5" /> {{ file.label }}
					</div>
				</div>

				<div class="flex items-center justify-between border-t border-outline-gray-2 px-5 py-4">
					<span class="text-base-semibold text-ink-gray-8">{{ __('Total') }}</span>
					<span class="text-lg font-semibold text-ink-gray-9">
						{{ formatCurrencyWithCode(summary.data.amount, summary.data.currency) }}
					</span>
				</div>
			</div>

			<!-- After payment -->
			<div class="mt-4 flex items-start gap-2 rounded-lg bg-surface-gray-2 px-4 py-3 text-p-sm text-ink-gray-7">
				<span class="lucide-info mt-0.5 size-4 shrink-0 text-ink-gray-5" />
				{{ __('After payment, all PDFs unlock instantly in “My Purchases” — view online or download anytime.') }}
			</div>

			<Button class="mt-5 w-full" variant="solid" :loading="payingNow" @click="payNow">
				<template #prefix><span class="lucide-credit-card size-4" /></template>
				{{ __('Pay') }} {{ formatCurrencyWithCode(summary.data.amount, summary.data.currency) }}
			</Button>
			<div class="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-gray-5">
				<span class="lucide-shield-check size-3.5" /> {{ __('Secure payment via Razorpay') }}
			</div>
		</template>
	</div>
</template>

<script setup>
import { ref, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { createResource, Button, Breadcrumbs, call, toast, usePageMeta } from 'frappe-ui'
import LayoutHeader from '@/components/Layouts/LayoutHeader.vue'
import { formatCurrencyWithCode } from '@/utils/localize'

const props = defineProps({ name: { type: String, required: true } })
const router = useRouter()
const REFERENCE_DOCTYPE = 'CELPIP Material Bundle'
const payingNow = ref(false)
const confirming = ref(false)
let pollTimer = null

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
			// Client-side only; the webhook is the source of truth. Move to a confirming screen.
			handler() {
				startConfirming()
			},
			modal: {
				ondismiss() {
					payingNow.value = false
				},
			},
		})
		razorpay.open()
	} catch (error) {
		toast.error(error.messages?.[0] || __('Could not start checkout'))
		payingNow.value = false
	}
}

function startConfirming() {
	confirming.value = true
	let delay = 3000
	const check = async () => {
		try {
			const r = await call('celpipedu.api.checkout.get_payment_status', {
				reference_doctype: REFERENCE_DOCTYPE,
				reference_name: props.name,
			})
			if (r.status === 'Confirmed') {
				cleanup()
				toast.success(__('Purchase complete'))
				router.replace({ name: 'MyMaterials' })
				return
			}
			if (r.status === 'Failed') {
				cleanup()
				confirming.value = false
				payingNow.value = false
				toast.error(__('Payment failed. Please try again.'))
				return
			}
		} catch (e) {
			// keep polling
		}
		delay = Math.min(delay + 1000, 10000)
		pollTimer = setTimeout(check, delay)
	}
	pollTimer = setTimeout(check, delay)
}

function cleanup() {
	if (pollTimer) {
		clearTimeout(pollTimer)
		pollTimer = null
	}
}
onBeforeUnmount(cleanup)

usePageMeta(() => ({ title: __('Checkout') }))
</script>
