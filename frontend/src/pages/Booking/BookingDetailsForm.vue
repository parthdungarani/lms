<template>
	<header
		class="sticky top-0 z-10 flex items-center justify-between border-b bg-surface-base px-3 py-2.5 sm:px-5"
	>
		<Breadcrumbs :items="breadcrumbs" />
	</header>
	<div class="mx-auto max-w-xl px-4 py-8 sm:py-10">
		<h1 class="mb-1 text-xl-semibold text-ink-gray-9">
			{{ __('Confirm your session') }}
		</h1>
		<p class="mb-6 text-p-sm text-ink-gray-6">
			{{ __('Tell us what to focus on, then continue to payment.') }}
		</p>

		<!-- Slot summary -->
		<div
			class="mb-5 overflow-hidden rounded-xl border border-outline-gray-2 bg-surface-base shadow-sm"
		>
			<div class="space-y-3 p-5">
				<div class="text-xs uppercase tracking-wide text-ink-gray-5">
					{{ __('Masterclass Session') }}
				</div>
				<div class="flex items-center gap-2.5 text-p-base text-ink-gray-8">
					<span class="lucide-calendar size-4 text-ink-gray-5" />
					{{ formattedDate }}
				</div>
				<div class="flex items-center gap-2.5 text-p-base text-ink-gray-8">
					<span class="lucide-clock size-4 text-ink-gray-5" />
					{{ startTime }}<span v-if="endTime"> – {{ endTime }}</span>
					<span v-if="timezone" class="text-ink-gray-5"> · {{ timezone }}</span>
				</div>
			</div>
		</div>

		<!-- Details form -->
		<div
			class="space-y-5 rounded-xl border border-outline-gray-2 bg-surface-base p-5 shadow-sm"
		>
			<FormControl
				type="select"
				:label="__('Module')"
				:options="moduleOptions"
				v-model="module"
				:placeholder="__('Select a module')"
				required
			/>
			<FormControl
				type="text"
				:label="__('Current CELPIP / IELTS score (optional)')"
				v-model="currentScore"
				:placeholder="__('e.g. CELPIP 8 or IELTS 6.5')"
			/>
			<label class="flex cursor-pointer items-start gap-2 text-p-sm text-ink-gray-7">
				<input
					type="checkbox"
					v-model="termsAccepted"
					class="mt-0.5 size-4 rounded border-outline-gray-3"
				/>
				<span>
					{{ __('I agree to the') }}
					<a href="/terms" target="_blank" class="text-ink-gray-9 underline">{{
						__('Terms & Conditions')
					}}</a>
				</span>
			</label>
		</div>

		<Button
			class="mt-6 w-full"
			variant="solid"
			size="lg"
			:loading="creating"
			:disabled="!canContinue"
			@click="confirmAndPay"
		>
			{{ __('Continue to payment') }}
		</Button>
		<p class="mt-3 text-center text-xs text-ink-gray-5">
			{{ __("Your slot is held once you continue — you won't be charged until you pay.") }}
		</p>
	</div>
</template>
<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { call, toast, Button, Breadcrumbs, FormControl } from 'frappe-ui'

const route = useRoute()
const router = useRouter()
const creating = ref(false)

const module = ref('')
const currentScore = ref('')
const termsAccepted = ref(false)

const moduleOptions = [
	{ label: __('Listening'), value: 'Listening' },
	{ label: __('Reading'), value: 'Reading' },
	{ label: __('Writing'), value: 'Writing' },
	{ label: __('Speaking'), value: 'Speaking' },
]

const breadcrumbs = [
	{ label: __('Masterclass Sessions'), route: { name: 'SlotPicker' } },
	{ label: __('Confirm'), route: { name: 'BookingDetailsForm' } },
]

const formattedDate = computed(() => {
	const d = String(route.query.slot_date || '')
	if (!d) return ''
	const [y, m, day] = d.split('-').map(Number)
	return new Date(y, m - 1, day).toLocaleDateString(undefined, {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	})
})

const startTime = computed(() => String(route.query.slot_start_time || '').slice(0, 5))
const endTime = computed(() => String(route.query.slot_end_time || '').slice(0, 5))
const timezone = computed(() => String(route.query.timezone || ''))
const canContinue = computed(() => !!module.value && termsAccepted.value)

async function confirmAndPay() {
	if (!canContinue.value) return
	creating.value = true
	try {
		const bookingName = await call(
			'celpipedu.api.booking.create_draft_booking',
			{
				slot_date: route.query.slot_date,
				slot_start_time: route.query.slot_start_time,
				slot_end_time: route.query.slot_end_time,
				module: module.value,
				current_score: currentScore.value,
				terms_accepted: termsAccepted.value ? 1 : 0,
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
		// The usual cause is the slot getting taken — send them back to pick another.
		router.push({ name: 'SlotPicker' })
	} finally {
		creating.value = false
	}
}
</script>
