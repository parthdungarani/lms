<template>
	<header
		class="sticky top-0 z-10 flex items-center justify-between border-b bg-surface-base px-3 py-2.5 sm:px-5"
	>
		<Breadcrumbs :items="breadcrumbs" />
	</header>
	<div class="mx-auto max-w-md px-5 py-16 text-center">
		<div v-if="status.loading" class="text-ink-gray-5">
			{{ __('Loading...') }}
		</div>
		<template v-else-if="isConfirmed">
			<span
				class="lucide-circle-check-big mx-auto mb-3 block size-8 text-ink-green-5"
			/>
			<div class="text-base-semibold text-ink-gray-9">
				{{ __('Payment successful!') }}
			</div>
			<p class="mt-2 text-p-sm text-ink-gray-6">
				{{ __("You're enrolled. We'll email you the details.") }}
			</p>
			<router-link :to="{ name: 'BatchDetail', params: { batchName: name } }">
				<Button variant="solid" class="mt-6">{{
					__('Go to batch')
				}}</Button>
			</router-link>
		</template>
		<template v-else>
			<span class="lucide-circle-x mx-auto mb-3 block size-8 text-ink-red-6" />
			<div class="text-base-semibold text-ink-gray-9">
				{{ __('Payment did not go through') }}
			</div>
			<p class="mt-2 text-p-sm text-ink-gray-6">
				{{ __('No amount was charged. You can try again.') }}
			</p>
			<Button variant="solid" class="mt-6" @click="retry">{{
				__('Try again')
			}}</Button>
		</template>
	</div>
</template>
<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { createResource, Button, Breadcrumbs } from 'frappe-ui'

const REFERENCE_DOCTYPE = 'LMS Batch'

const props = defineProps({
	name: { type: String, required: true },
})

const router = useRouter()

const breadcrumbs = [
	{ label: __('Batches'), route: { name: 'Batches' } },
	{
		label: __('Payment Result'),
		route: { name: 'BatchPaymentResult', params: { name: props.name } },
	},
]

// Always re-fetches from the backend on mount -- never trusts the ?status= query alone,
// so this page is safe to bookmark or reload regardless of how the user got here.
const status = createResource({
	url: 'celpipedu.api.checkout.get_payment_status',
	params: { reference_doctype: REFERENCE_DOCTYPE, reference_name: props.name },
	auto: true,
})

const isConfirmed = computed(() => status.data?.status === 'Confirmed')

function retry() {
	router.push({ name: 'BatchCheckout', params: { name: props.name } })
}
</script>
