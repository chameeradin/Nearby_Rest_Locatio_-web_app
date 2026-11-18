import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { Calendar, CheckCircle2, CreditCard, ExternalLink, Info, Users, X } from 'lucide-react';
import type { BookingRecord, DiscoveredPlace } from '../types/app';
import { CATEGORY_SINGULAR, FIELD_LIMITS } from '../lib/constants';
import { createBookingRecord, logActivity } from '../lib/firestoreService';

interface BookingOffer {
  offerId: string;
  roomName: string;
  totalAmount: number;
  currency: string;
  cancellationPolicy: string;
  paymentTypes: string[];
  checkoutUrl: string;
}

interface BookingAvailabilityResponse {
  configured: boolean;
  bookingComDeepLink: string;
  message?: string;
  error?: string;
  offers: BookingOffer[];
}

interface BookingModalProps {
  place: DiscoveredPlace | null;
  user: User | null;
  onClose: () => void;
  onRequireAuth: () => void;
  onBookingCreated: (booking: { placeName: string; date: string; id: string }) => void;
}

function getTomorrowDate(offsetDays = 1): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

export const BookingModal: React.FC<BookingModalProps> = ({
  place,
  user,
  onClose,
  onRequireAuth,
  onBookingCreated,
}) => {
  const isOvernight = place?.category === 'hotel' || place?.category === 'cabana';

  const [checkInDate, setCheckInDate] = useState(getTomorrowDate(1));
  const [checkOutDate, setCheckOutDate] = useState(getTomorrowDate(2));
  const [timeSlot, setTimeSlot] = useState('19:00');
  const [guests, setGuests] = useState(2);
  const [roomOrServiceType, setRoomOrServiceType] = useState('');
  const [paymentMethod, setPaymentMethod] =
    useState<BookingRecord['paymentMethod']>('pay_at_property');
  const [guestName, setGuestName] = useState(user?.displayName || '');
  const [notes, setNotes] = useState('');

  const [availability, setAvailability] = useState<BookingAvailabilityResponse | null>(null);
  const [checkingApi, setCheckingApi] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<BookingOffer | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  useEffect(() => {
    if (!place) return;
    setSuccessId(null);
    setError(null);
    setSelectedOffer(null);
    setGuestName(user?.displayName || user?.email?.split('@')[0] || '');
    if (place.category === 'hotel') {
      setRoomOrServiceType('Deluxe Double Room');
    } else if (place.category === 'cabana') {
      setRoomOrServiceType('Private Waterfront Cabana');
    } else if (place.category === 'restaurant') {
      setRoomOrServiceType('Indoor Dining Table');
    } else {
      setRoomOrServiceType('Reserved Cafe Table');
    }
  }, [place, user]);

  useEffect(() => {
    if (!place) return;
    let active = true;
    const checkBookingCom = async () => {
      setCheckingApi(true);
      try {
        const res = await fetch('/api/booking/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            placeName: place.displayName,
            category: place.category,
            checkInDate,
            checkOutDate: isOvernight ? checkOutDate : checkInDate,
            guests,
            lat: place.location.lat,
            lng: place.location.lng,
          }),
        });
        const data = (await res.json()) as BookingAvailabilityResponse;
        if (active) {
          setAvailability(data);
          if (data.offers?.length > 0) {
            setSelectedOffer(data.offers[0]);
            setRoomOrServiceType(data.offers[0].roomName);
          }
        }
      } catch {
        if (active) {
          setAvailability(null);
        }
      } finally {
        if (active) setCheckingApi(false);
      }
    };
    void checkBookingCom();
    return () => {
      active = false;
    };
  }, [place, checkInDate, checkOutDate, guests, isOvernight]);

  if (!place) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      onRequireAuth();
      return;
    }

    if (!user.emailVerified) {
      setError('Please verify your email address before submitting a booking (check your inbox or sign in with Google).');
      return;
    }

    if (isOvernight && checkOutDate <= checkInDate) {
      setError('Check-out date must be after check-in date.');
      return;
    }

    setSubmitting(true);
    try {
      const bookingSource: BookingRecord['bookingSource'] = selectedOffer
        ? 'booking_com_api'
        : 'in_app_request';

      const id = await createBookingRecord(user, {
        userName: guestName.trim() || user.displayName || 'Guest',
        placeId: place.id,
        placeName: place.displayName,
        placeAddress: place.formattedAddress,
        placePhone: place.nationalPhoneNumber || place.internationalPhoneNumber,
        category: place.category,
        checkInDate,
        ...(isOvernight ? { checkOutDate } : { timeSlot }),
        guests,
        roomOrServiceType: selectedOffer?.roomName || roomOrServiceType || 'Standard Reservation',
        ...(selectedOffer ? { totalAmount: selectedOffer.totalAmount, currency: selectedOffer.currency } : {}),
        paymentMethod,
        bookingSource,
        status: selectedOffer ? 'confirmed' : 'pending',
        notes,
      });

      await logActivity({
        user,
        action: 'booking_created',
        details: `${CATEGORY_SINGULAR[place.category]} booking at ${place.displayName} for ${checkInDate}`,
        category: 'booking',
      });

      setSuccessId(id);
      onBookingCreated({ placeName: place.displayName, date: checkInDate, id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save booking.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between shrink-0">
          <div>
            <p className="text-xs font-medium text-teal-700">
              {CATEGORY_SINGULAR[place.category]} Reservation
            </p>
            <h2 className="font-display text-lg font-semibold text-stone-900 truncate max-w-md">
              {place.displayName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg"
            aria-label="Close booking dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {successId ? (
            <div className="text-center py-6 space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <div>
                <h3 className="font-display text-xl font-semibold text-stone-900">
                  Reservation Saved
                </h3>
                <p className="text-sm text-stone-600 mt-1">
                  Reference <span className="font-mono font-semibold">{successId}</span> has been
                  saved to your booking history and scheduled for appointment alerts.
                </p>
              </div>
              {availability?.bookingComDeepLink && (
                <a
                  href={availability.bookingComDeepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
                >
                  Open Property on Booking.com
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              {!user && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
                  <p className="text-xs text-amber-900">
                    Sign in to save your booking history and receive appointment push alerts.
                  </p>
                  <button
                    type="button"
                    onClick={onRequireAuth}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg whitespace-nowrap shrink-0"
                  >
                    Sign In
                  </button>
                </div>
              )}

              {/* Dates & Guests */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    <Calendar className="w-3.5 h-3.5 inline mr-1 text-teal-700" />
                    {isOvernight ? 'Check-in Date' : 'Reservation Date'}
                  </label>
                  <input
                    type="date"
                    required
                    value={checkInDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>

                {isOvernight ? (
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      <Calendar className="w-3.5 h-3.5 inline mr-1 text-teal-700" />
                      Check-out Date
                    </label>
                    <input
                      type="date"
                      required
                      value={checkOutDate}
                      min={checkInDate}
                      onChange={(e) => setCheckOutDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-teal-700"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Preferred Time
                    </label>
                    <select
                      value={timeSlot}
                      onChange={(e) => setTimeSlot(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-teal-700"
                    >
                      <option value="09:00">09:00 AM</option>
                      <option value="12:30">12:30 PM</option>
                      <option value="15:00">03:00 PM</option>
                      <option value="19:00">07:00 PM</option>
                      <option value="20:30">08:30 PM</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    <Users className="w-3.5 h-3.5 inline mr-1 text-teal-700" />
                    Guests
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Guest Name
                  </label>
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    maxLength={FIELD_LIMITS.displayNameMax}
                    placeholder="Full name for reservation"
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>

              {/* Booking.com Live Inventory Section */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-stone-900">
                    Booking.com Room &amp; Rate Availability
                  </span>
                  {availability?.bookingComDeepLink && (
                    <a
                      href={availability.bookingComDeepLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-teal-800 hover:underline inline-flex items-center gap-1"
                    >
                      Search on Booking.com
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {checkingApi ? (
                  <p className="text-xs text-stone-500">Checking live Booking.com inventory...</p>
                ) : availability?.offers && availability.offers.length > 0 ? (
                  <div className="space-y-2">
                    {availability.offers.map((offer) => {
                      const active = selectedOffer?.offerId === offer.offerId;
                      return (
                        <button
                          key={offer.offerId}
                          type="button"
                          onClick={() => {
                            setSelectedOffer(offer);
                            setRoomOrServiceType(offer.roomName);
                          }}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            active
                              ? 'border-teal-700 bg-teal-50/60'
                              : 'border-stone-200 bg-white hover:border-stone-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-stone-900">
                              {offer.roomName}
                            </span>
                            <span className="text-sm font-mono font-semibold text-teal-800 tabular-nums">
                              {offer.currency} {offer.totalAmount.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-xs text-stone-500 mt-0.5">
                            {offer.cancellationPolicy}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-xs text-stone-600">
                    <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                    <div>
                      <p>
                        {availability?.message ||
                          'Direct Booking.com Demand API key is not configured. Submit an in-app reservation request below or check live rooms directly on Booking.com.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  {isOvernight ? 'Room / Cabana Type' : 'Seating / Service Preference'}
                </label>
                <input
                  type="text"
                  required
                  value={roomOrServiceType}
                  onChange={(e) => setRoomOrServiceType(e.target.value)}
                  maxLength={FIELD_LIMITS.roomTypeMax}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  <CreditCard className="w-3.5 h-3.5 inline mr-1 text-teal-700" />
                  Payment Method
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'pay_at_property', label: 'Pay at Property' },
                    { id: 'card_reservation', label: 'Card Guarantee' },
                    { id: 'booking_com_checkout', label: 'Booking.com Pay' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setPaymentMethod(opt.id as BookingRecord['paymentMethod'])
                      }
                      className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                        paymentMethod === opt.id
                          ? 'border-teal-700 bg-teal-50 text-teal-900'
                          : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Special Requests (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={FIELD_LIMITS.notesMax}
                  placeholder="Late check-in, dietary needs, waterfront view..."
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              {error && (
                <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
                  {error}
                </p>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Confirming...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
