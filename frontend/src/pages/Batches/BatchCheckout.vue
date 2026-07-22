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
			{{ __('Review your enrollment and complete payment to reserve your seat.') }}
		</p>

		<!-- Loading skeleton -->
		<div v-if="!summary.data" class="space-y-4">
			<div class="h-40 animate-pulse rounded-xl bg-surface-gray-2" />
			<div class="h-12 animate-pulse rounded-lg bg-surface-gray-2" />
		</div>

		<template v-else>
			<!-- Order summary card -->
			<div
				class="overflow-hidden rounded-xl border border-outline-gray-2 bg-surface-base shadow-sm"
			>
				<div class="border-b border-outline-gray-2 p-5">
					<div class="flex items-start justify-between gap-3">
						<div>
							<div class="text-xs uppercase tracking-wide text-ink-gray-5">
								{{ __('Batch enrollment') }}
							</div>
							<div class="mt-1 text-lg-semibold text-ink-gray-9">
								{{ summary.data.display_title }}
							</div>
						</div>
						<Badge
							v-if="summary.data.medium"
							variant="subtle"
							theme="green"
							size="md"
							:label="summary.data.medium"
						/>
					</div>

					<div class="mt-4 space-y-2.5">
						<div
							v-if="summary.data.start_date"
							class="text-p-sm text-ink-gray-7"
						>
							<DateRange
								:startDate="summary.data.start_date"
								:endDate="summary.data.end_date"
							/>
						</div>
						<div
							v-if="summary.data.start_time"
							class="flex items-center gap-2.5 text-p-sm text-ink-gray-7"
						>
							<span class="lucide-clock size-4 text-ink-gray-5" />
							<span dir="ltr">
								{{ formatTime(summary.data.start_time) }} –
								{{ formatTime(summary.data.end_time) }}
							</span>
						</div>
						<div
							v-if="summary.data.timezone"
							class="flex items-center gap-2.5 text-p-sm text-ink-gray-7"
						>
							<span class="lucide-globe size-4 text-ink-gray-5" />
							<span>{{ summary.data.timezone }}</span>
						</div>
						<div
							v-if="summary.data.seats_left !== null && summary.data.seats_left !== undefined"
							class="flex items-center gap-2.5 text-p-sm text-ink-gray-7"
						>
							<span class="lucide-users size-4 text-ink-gray-5" />
							<span>{{ summary.data.seats_left }} {{ __('seats left') }}</span>
						</div>
					</div>

					<p
						v-if="summary.data.description"
						class="mt-4 border-t border-outline-gray-2 pt-4 text-p-sm text-ink-gray-6"
					>
						{{ summary.data.description }}
					</p>
				</div>

				<!-- Price -->
				<div class="flex items-center justify-between bg-surface-gray-1 p-5">
					<span class="text-p-base text-ink-gray-7">{{ __('Total payable') }}</span>
					<span class="text-2xl-semibold text-ink-gray-9">{{ formattedAmount }}</span>
				</div>
			</div>

			<!-- Pay button -->
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

			<!-- Trust signals -->
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
					{{ __('Instant access to your batch after payment') }}
				</div>
			</div>
		</template>
	</div>
</template>
<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { call, createResource, toast, Button, Badge, Breadcrumbs } from 'frappe-ui'
import { formatNumberIntoCurrency, formatTime } from '@/utils'
import DateRange from '@/components/Common/DateRange.vue'

const REFERENCE_DOCTYPE = 'LMS Batch'

const props = defineProps({
	name: { type: String, required: true },
})

const router = useRouter()
const payingNow = ref(false)

const breadcrumbs = [
	{ label: __('Batches'), route: { name: 'Batches' } },
	{
		label: __('Checkout'),
		route: { name: 'BatchCheckout', params: { name: props.name } },
	},
]

const summary = createResource({
	url: 'celpipedu.api.checkout.get_order_summary',
	params: { reference_doctype: REFERENCE_DOCTYPE, reference_name: props.name },
	auto: true,
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
					name: 'BatchPaymentProcessing',
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
